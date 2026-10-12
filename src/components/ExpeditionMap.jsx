import React, { useCallback, useMemo, useState } from 'react';
import LiveMap from './LiveMap';
import MapStatsBar from './MapStatsBar';
import WeatherWidget from './WeatherWidget';
import NearbyMembersWidget from './NearbyMembersWidget';
import QuickChat from './QuickChat';
import useWeather from '../weather';
import { distanceMeters } from '../distance';

/* -------------------------------------------------------------------------
 * Small building blocks
 * ---------------------------------------------------------------------- */
function RailButton({ label, active = false, onClick, tone = 'default', children }) {
  const tones = {
    default: active
      ? 'border-white bg-white text-mono-950'
      : 'border-mono-800 bg-mono-900/90 text-white hover:border-mono-600',
    sos: 'border-sos/70 bg-sos text-white sos-pulse hover:bg-sos-600',
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
 * ExpeditionMap — the framed, rounded map card with a live stats top bar and
 * floating widgets (weather, nearby members, quick chat, and SOS).
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
}) {
  const others = useMemo(() => Object.values(otherUsers || {}), [otherUsers]);
  const weather = useWeather(myLocation);

  const [panel, setPanel] = useState(null); // 'nearby' | 'chat' | null
  const [sosOpen, setSosOpen] = useState(false);
  const [sosMessage, setSosMessage] = useState('');
  const [sosActive, setSosActive] = useState(false);

  // Group members sorted by distance.
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      <MapStatsBar
        groupName={groupName}
        sharing={sharing}
        nearest={nearest}
        farthest={farthest}
        weather={weather}
      />

      {/* Framed map card */}
      <div className="framed relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-mono-800 bg-mono-950 shadow-card">
        <LiveMap
          myLocation={myLocation}
          otherUsers={otherUsers}
          stories={stories}
          currentUser={currentUser}
          onAction={onAction}
          onAddStory={onAddStory}
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
          <RailButton label="Send SOS" tone="sos" onClick={() => setSosOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-5 w-5">
              <path d="M12 3 2 20h20z" />
              <path d="M12 9v5M12 17h.01" />
            </svg>
          </RailButton>
        </div>

        {/* Nearby members panel */}
        {panel === 'nearby' && (
          <NearbyMembersWidget
            members={members}
            onAction={onAction}
            onClose={() => setPanel(null)}
            className="absolute inset-x-3 bottom-3 z-[950] sm:inset-x-auto sm:bottom-auto sm:left-16 sm:top-1/2 sm:z-[900] sm:-translate-y-1/2"
          />
        )}

        {/* SOS active banner */}
        {sosActive && (
          <div className="absolute inset-x-3 top-3 z-[1250] flex items-center gap-3 rounded-2xl border border-sos/50 bg-sos/15 px-3 py-2.5 backdrop-blur sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
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
