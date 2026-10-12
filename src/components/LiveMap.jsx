import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { distanceMeters, formatDistance } from '../distance';
import { searchPlaces } from '../geocode';
import { getRoute, formatDuration, ROUTE_MODES } from '../routing';
import { MAPTILER_KEY } from '../mapKey';

// The one accent colour that survives the monochrome theme.
const GREEN = '#34d399';
// Road-wise route line (electric blue with a white casing).
const ROUTE_BLUE = '#60a5fa';

/* ---------------------------------------------------------------------------
 * Base maps.
 *
 * The MapTiler key comes from src/mapKey.js (VITE_MAPTILER_KEY). Leaflet is a
 * raster client, so we use MapTiler's raster endpoints — the vector
 * `style.json` needs MapLibre GL, which this app does not bundle:
 *   512px  https://api.maptiler.com/maps/hybrid-v4/{z}/{x}/{y}.jpg
 *   256px  https://api.maptiler.com/maps/hybrid-v4/256/{z}/{x}/{y}.jpg
 * ------------------------------------------------------------------------- */
const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">&copy; MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

const MAP_STYLES = {
  hybrid: {
    id: 'hybrid',
    label: 'Hybrid',
    // Recommended 512×512 raster tiles for Leaflet.
    url: `https://api.maptiler.com/maps/hybrid-v4/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
    options: {
      tileSize: 512, // 512px tiles must be paired with zoomOffset -1
      zoomOffset: -1,
      maxZoom: 21,
      crossOrigin: true,
      attribution: MAPTILER_ATTRIBUTION,
    },
  },
  // 256px variant — maximum library compatibility (no zoomOffset needed).
  hybrid256: {
    id: 'hybrid256',
    label: 'Hybrid 256',
    url: `https://api.maptiler.com/maps/hybrid-v4/256/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
    options: {
      maxZoom: 22,
      crossOrigin: true,
      attribution: MAPTILER_ATTRIBUTION,
    },
  },
  // Keeps the original black & white look available.
  mono: {
    id: 'mono',
    label: 'Mono',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
};

const DEFAULT_STYLE = 'hybrid';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);

/**
 * Custom map marker: the member's photo (or a monochrome initial) inside a
 * crisp ring. Members with an active story get a rotating green "story ring";
 * the current user gets a pulsing beacon.
 */
const createAvatarIcon = ({ name, avatarUrl, isMe = false, hasStory = false }) => {
  const initial = escapeHtml((name || '?').trim().charAt(0).toUpperCase() || '?');
  const inner = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;background:#1e293b;color:#e2e8f0;font:700 17px/1 Inter,system-ui,sans-serif;">${initial}</span>`;

  return L.divIcon({
    className: 'custom-avatar-marker',
    html: `
      <div class="marker-wrap ${isMe ? 'map-beacon' : ''} ${hasStory ? 'has-story' : ''}">
        <span class="marker-photo">${inner}</span>
      </div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -28],
  });
};

/** Monochrome teardrop pin for a searched location. */
const createSearchIcon = () =>
  L.divIcon({
    className: 'custom-avatar-marker',
    html: `
      <div class="search-pin">
        <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
          <path d="M12 2.6a6.9 6.9 0 0 0-6.9 6.9c0 4.9 6.9 12.1 6.9 12.1s6.9-7.2 6.9-12.1A6.9 6.9 0 0 0 12 2.6z"
            fill="#3b82f6" stroke="#030712" stroke-width="1.6" />
          <circle cx="12" cy="9.4" r="2.6" fill="#ffffff" />
        </svg>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });

/** Small green dot marking the centre of the safe zone. */
const createZoneIcon = () =>
  L.divIcon({
    className: 'custom-avatar-marker',
    html: '<span class="zone-center"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

/** Small helper actions rendered inside the Leaflet popup. */
function PopupAction({ children, onClick, accent = false, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        // Keep Leaflet from closing the popup / panning the map.
        event.stopPropagation();
        if (!disabled) onClick?.();
      }}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-semibold transition disabled:opacity-40 ${
        accent
          ? 'border-accent/50 bg-accent/10 text-accent-300'
          : 'border-mono-700 bg-mono-800 text-mono-100 hover:border-mono-500 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

/** Small travel-mode icon for the route panel. */
function ModeIcon({ mode, className = 'h-4 w-4' }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  };
  if (mode === 'walking') {
    return (
      <svg {...common}>
        <circle cx="13" cy="4.2" r="1.6" />
        <path d="m10.5 20 1.4-4.4-2.4-2.3 1-3.6 3 .9 1.7 3.1 2.3 1.2" />
        <path d="M8.2 20l1.3-3.1" />
      </svg>
    );
  }
  if (mode === 'cycling') {
    return (
      <svg {...common}>
        <circle cx="6" cy="17" r="3" />
        <circle cx="18" cy="17" r="3" />
        <path d="M6 17 10 8h4l3 9M9.6 12h4.8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 16v-2.6l1.6-4.4A2 2 0 0 1 8.5 7.6h7a2 2 0 0 1 1.9 1.4L19 13.4V16" />
      <path d="M4.5 16h15v2.6h-15z" />
      <circle cx="7.6" cy="19" r="1.3" />
      <circle cx="16.4" cy="19" r="1.3" />
    </svg>
  );
}

/** Imperative bits that need the Leaflet map instance. */
function MapBridge({ myLocation, locateSignal, flyTarget }) {
  const map = useMap();
  const lastSignal = useRef(0);

  React.useEffect(() => {
    if (locateSignal > lastSignal.current && myLocation) {
      lastSignal.current = locateSignal;
      map.flyTo([myLocation.lat, myLocation.lng], Math.max(map.getZoom(), 15), {
        duration: 0.8,
      });
    }
  }, [locateSignal, myLocation, map]);

  // Pan to a searched location when a new one is selected.
  React.useEffect(() => {
    if (!flyTarget) return;
    map.flyTo([flyTarget.lat, flyTarget.lng], Math.max(map.getZoom(), 13), {
      duration: 0.9,
    });
  }, [flyTarget, map]);

  return null;
}

export default function LiveMap({
  myLocation,
  otherUsers,
  stories = {},
  currentUser,
  onAction,
  onAddStory,
  safeZone = null,
  memberProfiles = {},
}) {
  const others = useMemo(() => Object.values(otherUsers || {}), [otherUsers]);

  // Members whose distance line is currently hidden.
  const [excluded, setExcluded] = useState(() => new Set());
  const [showPanel, setShowPanel] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [styleId, setStyleId] = useState(DEFAULT_STYLE);
  const [locateSignal, setLocateSignal] = useState(0);
  const wrapRef = useRef(null);

  // Location search (Google-Maps style).
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchTarget, setSearchTarget] = useState(null);

  // Road-wise route to the searched place.
  const [routeMode, setRouteMode] = useState('driving');
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);

  const activeStyle = MAP_STYLES[styleId] || MAP_STYLES[DEFAULT_STYLE];

  // Debounced forward geocoding as the user types.
  useEffect(() => {
    const q = query.trim();
    // Skip when empty, too short, or already resolved to the chosen place.
    if (q.length < 3 || (searchTarget && q === searchTarget.name)) {
      setResults([]);
      return undefined;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchError('');

    const timer = setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then((found) => {
          setResults(found);
          setShowResults(true);
          if (found.length === 0) setSearchError('No places found.');
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') setSearchError('Search is unavailable right now.');
        })
        .finally(() => setSearching(false));
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchTarget]);

  const selectResult = useCallback((place) => {
    setSearchTarget(place);
    setQuery(place.name);
    setResults([]);
    setShowResults(false);
    setSearchError('');
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTarget(null);
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSearchError('');
  }, []);

  // Live distance from the current user to the searched place — recomputed on
  // every GPS update, so it updates in real time as you move.
  const searchDistance = useMemo(
    () => (searchTarget && myLocation ? distanceMeters(myLocation, searchTarget) : null),
    [searchTarget, myLocation]
  );

  // Re-route only when the user has moved ~100 m (rounded coordinate key),
  // so live GPS ticks don't hammer the routing API.
  const originKey = myLocation
    ? `${myLocation.lat.toFixed(3)},${myLocation.lng.toFixed(3)}`
    : '';

  useEffect(() => {
    if (!searchTarget || !myLocation) {
      setRoute(null);
      return undefined;
    }

    const controller = new AbortController();
    setRouting(true);

    const timer = setTimeout(() => {
      getRoute(myLocation, searchTarget, routeMode, controller.signal)
        .then((result) => setRoute(result))
        .catch(() => {})
        .finally(() => setRouting(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `originKey` stands in for myLocation so we only re-route after a move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTarget, routeMode, originKey]);

  const routeDistance = route?.distanceMeters ?? searchDistance;
  const routeDuration = route?.durationSeconds ?? null;
  const routeApprox = route?.approx ?? false;

  const toggleMember = useCallback((userId) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const measured = useMemo(() => {
    if (!myLocation) return [];
    return others.map((user) => ({
      user,
      meters: distanceMeters(myLocation, user),
      visible: !excluded.has(user.userId),
      hasStory: Boolean(stories[user.userId]),
    }));
  }, [others, myLocation, excluded, stories]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  if (!myLocation) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-mono-950">
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-mono-800 bg-mono-900">
          <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-accent/70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
        <p className="text-sm font-semibold text-white">Acquiring GPS location…</p>
        <p className="max-w-xs text-center text-xs text-mono-400">
          Allow location access so your group can see you on the map.
        </p>
      </div>
    );
  }

  const myIcon = createAvatarIcon({
    name: myLocation.name,
    avatarUrl: myLocation.avatarUrl,
    isMe: true,
    hasStory: Boolean(stories[currentUser?.id]),
  });

  return (
    <div ref={wrapRef} className="relative h-full w-full bg-mono-950">
      <MapContainer
        center={[myLocation.lat, myLocation.lng]}
        zoom={15}
        zoomControl={false}
        className="h-full w-full"
      >
        {/* `key` remounts the layer so tileSize/zoomOffset changes apply. */}
        <TileLayer key={activeStyle.id} url={activeStyle.url} {...activeStyle.options} />
        <MapBridge
          myLocation={myLocation}
          locateSignal={locateSignal}
          flyTarget={searchTarget}
        />

        {/* Geofenced safe zone — a circle centred on the admin's live position. */}
        {safeZone?.enabled && safeZone.centerLat != null && safeZone.centerLng != null && (
          <>
            <Circle
              center={[safeZone.centerLat, safeZone.centerLng]}
              radius={safeZone.radiusM}
              pathOptions={{
                color: '#10b981',
                weight: 2,
                opacity: 0.9,
                dashArray: '8 7',
                fillColor: '#10b981',
                fillOpacity: 0.08,
              }}
            >
              <Tooltip permanent direction="top" className="safe-tooltip">
                Safe zone · {formatDistance(safeZone.radiusM)}
              </Tooltip>
            </Circle>
            {/* Marker at the zone centre */}
            <Marker
              position={[safeZone.centerLat, safeZone.centerLng]}
              icon={createZoneIcon()}
              interactive={false}
            />
          </>
        )}

        {/* Road-wise route to the searched place — blue with a white casing. */}
        {searchTarget && (
          <>
            {route && route.coordinates.length > 1 && (
              <Polyline
                positions={route.coordinates}
                pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
              />
            )}
            <Polyline
              positions={
                route && route.coordinates.length > 1
                  ? route.coordinates
                  : [
                      [myLocation.lat, myLocation.lng],
                      [searchTarget.lat, searchTarget.lng],
                    ]
              }
              pathOptions={
                route
                  ? { color: ROUTE_BLUE, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }
                  : { color: ROUTE_BLUE, weight: 4, opacity: 0.9, dashArray: '6 8' }
              }
            >
              <Tooltip permanent direction="center" className="route-tooltip">
                {routing && !route ? '…' : formatDistance(routeDistance)}
              </Tooltip>
            </Polyline>
          </>
        )}

        {/* Searched location pin */}
        {searchTarget && (
          <Marker position={[searchTarget.lat, searchTarget.lng]} icon={createSearchIcon()}>
            <Popup>
              <div className="text-left">
                <p className="text-[13px] font-bold text-white">{searchTarget.name}</p>
                <p className="mt-0.5 text-[11px] font-medium text-mono-400">
                  {routing && !route
                    ? 'Finding the route…'
                    : `${formatDistance(routeDistance)}${
                        routeDuration ? ` · ~${formatDuration(routeDuration)} ${routeApprox ? 'est.' : ''}` : ''
                      }`}
                </p>
                <div className="mt-3">
                  <PopupAction onClick={clearSearch}>Clear location</PopupAction>
                </div>
              </div>
            </Popup>
          </Marker>
        )}


        {/* Green distance polylines: current user -> each selected member. */}
        {measured
          .filter((m) => m.visible)
          .map(({ user, meters }) => (
            <Polyline
              key={`line-${user.userId}`}
              positions={[
                [myLocation.lat, myLocation.lng],
                [user.lat, user.lng],
              ]}
              pathOptions={{
                color: GREEN,
                weight: 3,
                opacity: 0.9,
                dashArray: '7 9',
                lineCap: 'round',
              }}
            >
              <Tooltip permanent direction="center" className="distance-tooltip">
                {formatDistance(meters)}
              </Tooltip>
            </Polyline>
          ))}

        {/* Current user */}
        <Marker position={[myLocation.lat, myLocation.lng]} icon={myIcon}>
          <Popup>
            <div className="text-left">
              <p className="text-[13px] font-bold text-white">{myLocation.name} (you)</p>
              <p className="mt-0.5 text-[11px] font-medium text-mono-400">
                Your live location
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <PopupAction accent disabled={!stories[currentUser?.id]} onClick={() => onAction?.('story', { userId: currentUser?.id, name: myLocation.name, avatarUrl: myLocation.avatarUrl })}>
                  Story
                </PopupAction>
                <PopupAction onClick={() => onAddStory?.()}>+ Add story</PopupAction>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Other group members */}
        {measured.map(({ user, meters, hasStory }) => {
          const profile = memberProfiles[user.userId] || {};
          const dText = formatDistance(meters);
          return (
            <Marker
              key={user.userId}
              position={[user.lat, user.lng]}
              icon={createAvatarIcon({ ...user, hasStory })}
            >
              <Popup>
                <div className="text-left">
                  {/* Identity */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 ${
                        hasStory ? 'border-neon' : 'border-mono-700'
                      }`}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-mono-800 text-sm font-bold text-mono-100">
                          {user.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-white">
                        {user.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-accent-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {dText ? `${dText} away` : 'Locating…'}
                      </span>
                      {hasStory && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onAction?.('story', user);
                          }}
                          className="mt-1 rounded-full border border-neon/40 bg-neon/15 px-2 py-0.5 text-[10px] font-bold text-neon-300"
                        >
                          ● View story
                        </button>
                      )}
                    </span>
                  </div>

                  {/* Contact details */}
                  {(profile.phone || profile.social) && (
                    <div className="mt-2.5 flex flex-col gap-1">
                      {profile.phone && (
                        <a
                          href={`tel:${profile.phone}`}
                          className="flex items-center gap-2 rounded-lg border border-mono-800/80 bg-mono-900/70 px-2.5 py-1.5 text-[11px] font-medium text-mono-200 hover:border-electric/50 hover:text-white"
                        >
                          <span className="text-electric-400">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-3.5 w-3.5">
                              <path d="M5 4h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                            </svg>
                          </span>
                          <span className="truncate">{profile.phone}</span>
                        </a>
                      )}
                      {profile.social && (
                        <span className="flex items-center gap-2 rounded-lg border border-mono-800/80 bg-mono-900/70 px-2.5 py-1.5 text-[11px] font-medium text-mono-200">
                          <span className="text-neon-300">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-3.5 w-3.5">
                              <circle cx="12" cy="12" r="9" />
                              <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
                            </svg>
                          </span>
                          <span className="truncate">{profile.social}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <PopupAction accent onClick={() => onAction?.('call', user)}>
                      Call
                    </PopupAction>
                    <PopupAction accent onClick={() => onAction?.('dm', user)}>
                      Message
                    </PopupAction>
                    <PopupAction onClick={() => onAction?.('vibrate', user)}>Vibrate</PopupAction>
                    <PopupAction onClick={() => onAction?.('ring', user)}>Ring</PopupAction>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAction?.('sheet', user);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-mono-700 bg-mono-800/70 py-2 text-[11px] font-semibold text-mono-100 transition hover:border-neon/50 hover:text-white"
                  >
                    More options
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Search any location + live distance from you */}
      <div className="absolute left-3 right-3 top-3 z-[1200] sm:left-1/2 sm:right-auto sm:top-4 sm:w-[26rem] sm:-translate-x-1/2">
        <div className="relative">
          <div className="flex items-center gap-2 rounded-2xl border border-mono-800 bg-mono-900/95 px-3 py-2 shadow-lift backdrop-blur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4 shrink-0 text-mono-400">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 180)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) selectResult(results[0]);
                if (e.key === 'Escape') setShowResults(false);
              }}
              placeholder="Search any place…"
              className="input-flush py-1"
              aria-label="Search for a location"
            />
            {searching && (
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-mono-600 border-t-white" />
            )}
            {(query || searchTarget) && !searching && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearSearch}
                aria-label="Clear search"
                className="shrink-0 text-mono-400 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>

          {/* Suggestions */}
          {showResults && (results.length > 0 || searchError) && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-2xl border border-mono-800 bg-mono-900/95 p-1.5 shadow-lift backdrop-blur">
              {results.length > 0 ? (
                <ul className="flex flex-col">
                  {results.map((place) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectResult(place)}
                        className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-mono-800"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0 text-mono-500">
                          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
                          <circle cx="12" cy="10" r="2.4" />
                        </svg>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-white">
                            {place.name.split(',')[0]}
                          </span>
                          <span className="block truncate text-[11px] text-mono-400">
                            {place.name}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-xs text-mono-400">{searchError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top-right controls: base map + distance selector + fullscreen
          (pushed below the search bar on phones) */}
      <div className="absolute right-3 top-[4.75rem] z-[1000] flex flex-col items-end gap-2 sm:right-4 sm:top-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowStyleMenu((v) => !v)}
            aria-expanded={showStyleMenu}
            aria-label="Change base map"
            title="Change base map"
            className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border border-mono-800 bg-mono-900/90 px-3 text-[11px] font-semibold text-white shadow-card backdrop-blur"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 3 3 8l9 5 9-5z" />
              <path d="m3 14 9 5 9-5" />
            </svg>
            {activeStyle.label}
          </button>
          <button
            type="button"
            onClick={() => setShowPanel((v) => !v)}
            className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border border-mono-800 bg-mono-900/90 px-3 text-[11px] font-semibold text-white shadow-card backdrop-blur"
            aria-expanded={showPanel}
          >
            <span className="h-2 w-2 rounded-full bg-accent" />
            Lines
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen map"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-mono-800 bg-mono-900/90 text-white shadow-card backdrop-blur"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        </div>

        {showStyleMenu && (
          <div className="pointer-events-auto w-56 animate-pop-in rounded-2xl border border-mono-800 bg-mono-900/95 p-2 shadow-lift backdrop-blur">
            <p className="px-1.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wide text-mono-400">
              Base map
            </p>
            {Object.values(MAP_STYLES).map((style) => {
              const active = style.id === styleId;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setStyleId(style.id);
                    setShowStyleMenu(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium transition ${
                    active ? 'bg-mono-800 text-white' : 'text-mono-300 hover:bg-mono-800'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      active ? 'border-accent' : 'border-mono-600'
                    }`}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{style.label}</span>
                </button>
              );
            })}
            <p className="px-1.5 pb-1 pt-1.5 text-[10px] leading-tight text-mono-500">
              MapTiler Hybrid raster · key restricted by domain
            </p>
          </div>
        )}

        {showPanel && (
          <div className="pointer-events-auto w-60 animate-pop-in rounded-2xl border border-mono-800 bg-mono-900/95 p-3 shadow-lift backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-wide text-mono-400">
              Distance lines
            </p>
            <p className="mt-0.5 text-[10px] text-mono-500">
              Tap a member to show or hide their green line.
            </p>
            {measured.length === 0 ? (
              <p className="mt-2 text-xs text-mono-400">No other members sharing yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {measured.map(({ user, meters, visible }) => (
                  <li key={user.userId}>
                    <button
                      type="button"
                      onClick={() => toggleMember(user.userId)}
                      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-mono-800"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          visible ? 'border-accent bg-accent text-mono-950' : 'border-mono-600'
                        }`}
                      >
                        {visible && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                            <path d="m5 13 4.5 4.5L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">
                        {user.name}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-accent-300">
                        {formatDistance(meters)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Bottom-left: live status + locate */}
      <div
        className={`absolute left-3 z-[1000] flex flex-col items-start gap-2 sm:left-4 ${
          searchTarget ? 'bottom-[13rem] sm:bottom-4' : 'bottom-4'
        }`}
      >
        <div className="pointer-events-none flex items-center gap-2 rounded-full border border-mono-800 bg-mono-900/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-card backdrop-blur sm:text-xs">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="truncate">You are live</span>
          <span className="hidden text-mono-600 sm:inline">·</span>
          <span className="hidden truncate text-mono-400 sm:inline">
            {others.length} {others.length === 1 ? 'member' : 'members'} sharing
          </span>
        </div>
        <button
          type="button"
          onClick={() => setLocateSignal((n) => n + 1)}
          aria-label="Center on me"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-mono-800 bg-mono-900/90 text-white shadow-card backdrop-blur"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </div>

      {/* Route summary panel (Google-Maps style) */}
      {searchTarget && (
        <div className="absolute inset-x-0 bottom-0 z-[1300] sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:w-[25rem] sm:-translate-x-1/2">
          <div className="rounded-t-3xl border border-mono-800 bg-mono-900/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-2.5 shadow-lift backdrop-blur sm:rounded-2xl sm:pb-3.5">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-mono-700 sm:hidden" />

            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon-tri text-white shadow-glow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
                  <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.4" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-mono-500">
                  Route to
                </p>
                <p className="truncate text-sm font-semibold text-white">
                  {searchTarget.name.split(',')[0]}
                </p>
                <p className="truncate text-[11px] text-mono-400">{searchTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear route"
                className="btn btn-ghost -mr-1 -mt-1 shrink-0 p-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                {routing && !route ? (
                  <div className="flex items-center gap-2 pb-0.5">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-mono-600 border-t-white" />
                    <span className="text-sm font-medium text-mono-400">Finding route…</span>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-extrabold leading-none tracking-tight text-white">
                      {formatDistance(routeDistance)}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-mono-400">
                      {routeDuration ? (
                        <>
                          <span className="font-semibold text-mono-200">
                            ~{formatDuration(routeDuration)}
                          </span>
                          <span>·</span>
                        </>
                      ) : null}
                      <span className="text-blue-400">road route</span>
                      {routeApprox ? <span>· est.</span> : null}
                    </p>
                  </>
                )}
              </div>

              {/* Travel-mode segmented control */}
              <div className="flex shrink-0 gap-1 rounded-xl border border-mono-800 bg-mono-850 p-1">
                {ROUTE_MODES.map((mode) => {
                  const active = routeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRouteMode(mode.id)}
                      title={mode.label}
                      aria-pressed={active}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                        active ? 'bg-neon-tri text-white shadow-glowViolet' : 'text-mono-300 hover:text-white'
                      }`}
                    >
                      <ModeIcon mode={mode.id} />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute right-3 z-[1000] sm:right-4 ${searchTarget ? 'bottom-[13rem] sm:bottom-4' : 'bottom-4'}`}>
        <button
          type="button"
          onClick={() => onAddStory?.()}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-neon-tri px-4 py-2.5 text-sm font-bold text-white shadow-glowViolet transition hover:scale-[1.03] active:scale-[0.97]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Story
        </button>
      </div>
    </div>
  );
}
