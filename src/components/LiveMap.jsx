import React, { useCallback, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { distanceMeters, formatDistance } from '../distance';

// The one accent colour that survives the monochrome theme.
const GREEN = '#22c55e';

/* ---------------------------------------------------------------------------
 * Base maps.
 *
 * MapTiler key: keep it out of source control in production by setting
 * VITE_MAPTILER_KEY in Frontend/.env — the literal below is only a fallback.
 * Restrict the key to your domains in the MapTiler dashboard.
 *
 * Leaflet is a raster client, so we use MapTiler's raster endpoints
 * (the vector `style.json` needs MapLibre GL, which this app does not bundle):
 *   512px  https://api.maptiler.com/maps/hybrid-v4/{z}/{x}/{y}.jpg
 *   256px  https://api.maptiler.com/maps/hybrid-v4/256/{z}/{x}/{y}.jpg
 * ------------------------------------------------------------------------- */
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || 'PAAtuckOiCsaL8MuwMIX';

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
    : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;background:#27272a;color:#f4f4f5;font:700 17px/1 Inter,system-ui,sans-serif;">${initial}</span>`;

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

/** Imperative bits that need the Leaflet map instance. */
function MapBridge({ myLocation, locateSignal }) {
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

  return null;
}

export default function LiveMap({
  myLocation,
  otherUsers,
  stories = {},
  currentUser,
  onAction,
  onAddStory,
}) {
  const others = useMemo(() => Object.values(otherUsers || {}), [otherUsers]);

  // Members whose distance line is currently hidden.
  const [excluded, setExcluded] = useState(() => new Set());
  const [showPanel, setShowPanel] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [styleId, setStyleId] = useState(DEFAULT_STYLE);
  const [locateSignal, setLocateSignal] = useState(0);
  const wrapRef = useRef(null);

  const activeStyle = MAP_STYLES[styleId] || MAP_STYLES[DEFAULT_STYLE];

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
        <MapBridge myLocation={myLocation} locateSignal={locateSignal} />

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
        {measured.map(({ user, meters, hasStory }) => (
          <Marker
            key={user.userId}
            position={[user.lat, user.lng]}
            icon={createAvatarIcon({ ...user, hasStory })}
          >
            <Popup>
              <div className="text-left">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-11 w-11 overflow-hidden rounded-full border ${
                      hasStory ? 'border-accent' : 'border-mono-700'
                    }`}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-mono-800 text-sm font-bold text-mono-100">
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-white">
                      {user.name}
                    </span>
                    <span className="block text-[11px] font-medium text-mono-400">
                      {formatDistance(meters) ? `${formatDistance(meters)} away` : 'Locating…'}
                    </span>
                    {hasStory && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAction?.('story', user);
                        }}
                        className="mt-0.5 text-[11px] font-bold text-accent-300"
                      >
                        View story
                      </button>
                    )}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <PopupAction accent onClick={() => onAction?.('dm', user)}>
                    Message
                  </PopupAction>
                  <PopupAction onClick={() => onAction?.('vibrate', user)}>Vibrate</PopupAction>
                  <PopupAction onClick={() => onAction?.('ring', user)}>Ring</PopupAction>
                  <PopupAction onClick={() => onAction?.('sheet', user)}>More</PopupAction>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Live status pill */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex max-w-[calc(100%-6.5rem)] items-center gap-2 rounded-full border border-mono-800 bg-mono-900/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-card backdrop-blur sm:left-4 sm:top-4 sm:text-xs">
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

      {/* Top-right controls: base map + distance selector + fullscreen */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2 sm:right-4 sm:top-4">
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

      {/* Bottom-left: locate + add story */}
      <div className="absolute bottom-4 left-3 z-[1000] flex flex-col gap-2 sm:left-4">
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

      <div className="absolute bottom-4 right-3 z-[1000] sm:right-4">
        <button
          type="button"
          onClick={() => onAddStory?.()}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-mono-950 shadow-lift active:translate-y-px"
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
