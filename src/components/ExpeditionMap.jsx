import React, { useCallback, useMemo, useState } from 'react';
import LiveMap from './LiveMap';
import MapStatsBar from './MapStatsBar';
import WeatherWidget from './WeatherWidget';
import NearbyMembersWidget from './NearbyMembersWidget';
import QuickChat from './QuickChat';
import MapAlertOverlay from './MapAlertOverlay';
import SafeZonePanel from './SafeZonePanel';
import BroadcastPanel from './BroadcastPanel';
import useWeather from '../weather';
import { distanceMeters, formatDistance } from '../distance';

/* -------------------------------------------------------------------------
 * Small building blocks
 * ---------------------------------------------------------------------- */
function RailButton({ label, active = false, onClick, tone = 'default', children }) {
  const tones = {
    default: active
      ? 'bg-neon-tri text-white shadow-glowViolet'
      : 'border-mono-800 bg-mono-900/90 text-white hover:border-mono-600',
    sos: 'border-sos/70 bg-sos text-white sos-pulse hover:bg-sos-600',
    accent: active
      ? 'border-accent bg-accent text-mono-950'
      : 'border-accent/50 bg-mono-900/90 text-accent-300 hover:border-accent',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-card backdrop-blur transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/** Confirmation dialog for the SOS signal. */
function SosDialog({ groupName, message, onMessage, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[2800] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl border border-sos/40 bg-mono-900 p-5 shadow-lift animate-slide-up sm:rounded-3xl sm:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sos text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6">
              <path d="M12 3 2 20h20z" />
              <path d="M12 9v5M12 17h.01" />
            </svg>
          </span>
          <div>
            <p className="text-base font-bold text-white">Send SOS?</p>
            <p className="text-xs text-mono-400">
              Alerts everyone in {groupName || 'this expedition'} with your location.
            </p>
          </div>
        </div>

        <input
          type="text"
          value={message}
          maxLength={140}
          onChange={(e) => onMessage(e.target.value)}
          placeholder="Optional note (e.g. twisted ankle, need help)"
          className="input mt-4"
        />

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn flex-1 bg-sos text-white hover:bg-sos-600">
            Send SOS
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ExpeditionMap — the framed, rounded map card with a live stats top bar,
 * floating widgets (weather, nearby members, quick chat, SOS), the geofenced
 * safe zone, boundary-breach banners and admin map broadcasts.
 */
export default function ExpeditionMap({
  groupName,
  myLocation,
  otherUsers,
  stories = {},
  currentUser,
  socket,
  groupId,
  onAction,
  onAddStory,
  // Safety features
  safeZone = null,
  isAdmin = false,
  onSetSafeZone,
  onDisableSafeZone,
  broadcasts = [],
  onDismissBroadcast,
  breaches = [],
  onDismissBreach,
  onSendBroadcast,
}) {
  const others = useMemo(() => Object.values(otherUsers || {}), [otherUsers]);
  const weather = useWeather(myLocation);

  const [panel, setPanel] = useState(null); // 'nearby' | 'chat' | 'safe' | 'broadcast' | null
  const [sosOpen, setSosOpen] = useState(false);
  const [sosMessage, setSosMessage] = useState('');
  const [sosActive, setSosActive] = useState(false);

  const members = useMemo(
    () =>
      others
        .map((u) => ({
          ...u,
          meters: myLocation ? distanceMeters(myLocation, u) : null,
          hasStory: Boolean(stories?.[u.userId]),
        }))
        .sort((a, b) => (a.meters ?? Infinity) - (b.meters ?? Infinity)),
    [others, myLocation, stories]
  );

  const sharing = others.length;
  const nearest = members.length ? members[0].meters : null;
  const farthest = members.length ? members[members.length - 1].meters : null;
  const zoneActive = Boolean(safeZone?.enabled);

  const sendSos = useCallback(() => {
    socket?.emit('sos-alert', {
      groupId,
      lat: myLocation?.lat ?? null,
      lng: myLocation?.lng ?? null,
      message: sosMessage.trim() || 'Needs help',
    });
    setSosOpen(false);
    setSosActive(true);
    setSosMessage('');
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 600]);
      }
    } catch {
      /* unsupported */
    }
  }, [socket, groupId, myLocation, sosMessage]);

  const clearSos = useCallback(() => {
    socket?.emit('sos-clear', { groupId });
    setSosActive(false);
  }, [socket, groupId]);

  const topAlerts = sosActive || breaches.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      <MapStatsBar
        groupName={groupName}
        sharing={sharing}
        nearest={nearest}
        farthest={farthest}
        weather={weather}
      />

      {/* Framed map card — neon glass */}
      <div className="neon-frame min-h-0 flex-1 bg-mono-950">
        <LiveMap
          myLocation={myLocation}
          otherUsers={otherUsers}
          stories={stories}
          currentUser={currentUser}
          onAction={onAction}
          onAddStory={onAddStory}
          safeZone={safeZone}
        />

        {/* Weather widget (desktop — the stats bar shows a chip on phones) */}
        <WeatherWidget weather={weather} className="absolute left-4 top-4 z-[900] hidden sm:block" />

        {/* Floating action rail */}
        <div className="absolute left-3 top-1/2 z-[900] flex -translate-y-1/2 flex-col gap-2 sm:left-4">
          <RailButton
            label="Nearby members"
            active={panel === 'nearby'}
            onClick={() => setPanel((p) => (p === 'nearby' ? null : 'nearby'))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5">
              <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
              <circle cx="10" cy="8" r="3.2" />
              <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4" />
            </svg>
          </RailButton>

          <RailButton
            label="Quick chat"
            active={panel === 'chat'}
            onClick={() => setPanel((p) => (p === 'chat' ? null : 'chat'))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5">
              <path d="M20 12a7 7 0 0 1-7 7H9l-4 3v-4.6A7 7 0 0 1 11 5h2a7 7 0 0 1 7 7z" />
            </svg>
          </RailButton>

          <RailButton
            label={zoneActive ? 'Safe zone (active)' : 'Safe zone'}
            tone="accent"
            active={panel === 'safe'}
            onClick={() => setPanel((p) => (p === 'safe' ? null : 'safe'))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="8.5" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </RailButton>

          {isAdmin && (
            <RailButton
              label="Broadcast to map"
              active={panel === 'broadcast'}
              onClick={() => setPanel((p) => (p === 'broadcast' ? null : 'broadcast'))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M4 10v4a1 1 0 0 0 1 1h2l4 3V6L7 9H5a1 1 0 0 0-1 1z" />
                <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7 7 0 0 1 0 11" />
              </svg>
            </RailButton>
          )}

          <RailButton label="Send SOS" tone="sos" onClick={() => setSosOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-5 w-5">
              <path d="M12 3 2 20h20z" />
              <path d="M12 9v5M12 17h.01" />
            </svg>
          </RailButton>
        </div>

        {/* High-priority top alerts (SOS + boundary breaches) */}
        {topAlerts && (
          <div className="absolute inset-x-3 top-3 z-[1300] flex flex-col gap-2 sm:inset-x-auto sm:left-1/2 sm:w-[24rem] sm:-translate-x-1/2">
            {sosActive && (
              <div className="flex items-center gap-3 rounded-2xl border border-sos/50 bg-sos/20 px-3 py-2.5 backdrop-blur">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sos text-white sos-pulse">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                    <path d="M12 3 2 20h20z" />
                    <path d="M12 9v5M12 17h.01" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 text-xs font-semibold text-white">
                  SOS active — your group has been alerted
                </span>
                <button type="button" onClick={clearSos} className="btn btn-secondary btn-sm shrink-0">
                  Clear
                </button>
              </div>
            )}

            {breaches.map((b) => (
              <div
                key={b.userId}
                className="alert-shake flex items-center gap-3 rounded-2xl border border-sos/60 bg-sos/20 px-3 py-2.5 backdrop-blur"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sos text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                    <path d="M12 3 2 20h20z" />
                    <path d="M12 9v5M12 17h.01" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-white">
                    {b.name} has left the safe radius area!
                  </span>
                  <span className="block text-[10px] font-medium text-mono-200">
                    {formatDistance(b.distanceM)} from the zone · radius {formatDistance(b.radiusM)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onDismissBreach?.(b.userId)}
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Nearby members panel */}
        {panel === 'nearby' && (
          <NearbyMembersWidget
            members={members}
            onAction={onAction}
            onClose={() => setPanel(null)}
            className="absolute inset-x-3 bottom-3 z-[950] sm:inset-x-auto sm:bottom-auto sm:left-16 sm:top-1/2 sm:z-[900] sm:-translate-y-1/2"
          />
        )}

        {/* Admin broadcast overlay (modal-like, over the map canvas) */}
        <MapAlertOverlay queue={broadcasts} onDismiss={onDismissBroadcast} />
      </div>

      {/* Quick chat overlay */}
      {panel === 'chat' && (
        <QuickChat
          socket={socket}
          groupId={groupId}
          currentUser={currentUser}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === 'safe' && (
        <SafeZonePanel
          safeZone={safeZone}
          isAdmin={isAdmin}
          onClose={() => setPanel(null)}
          onSet={(radiusM) => onSetSafeZone?.(radiusM)}
          onDisable={() => {
            onDisableSafeZone?.();
            setPanel(null);
          }}
        />
      )}

      {panel === 'broadcast' && isAdmin && (
        <BroadcastPanel onClose={() => setPanel(null)} onSend={onSendBroadcast} />
      )}

      {sosOpen && (
        <SosDialog
          groupName={groupName}
          message={sosMessage}
          onMessage={setSosMessage}
          onCancel={() => setSosOpen(false)}
          onConfirm={sendSos}
        />
      )}
    </div>
  );
}
