import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from './api';
import { distanceMeters, formatDistance } from './distance';
import LiveMap from './components/LiveMap';
import GroupChat from './components/GroupChat';
import GroupManager from './components/GroupManager';
import ExpensePanel from './components/ExpensePanel';
import MembersPanel from './components/MembersPanel';
import AuthForm from './components/AuthForm';
import Avatar from './components/Avatar';
import ToastStack from './components/ToastStack';
import MemberActionSheet from './components/MemberActionSheet';
import StoryViewer from './components/StoryViewer';
import StoryComposer from './components/StoryComposer';
import DirectMessages from './components/DirectMessages';
import { installAudioUnlock, playRingtone, stopRingtone, vibrate } from './components/alertSound';

const API = 'http://localhost:5000';
const USER_KEY = 'trip-tracker.user';

/* -------------------------------------------------------------------------
 * Inline icon set — keeps the bundle free of an icon dependency.
 * ---------------------------------------------------------------------- */
const iconProps = {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const CompassIcon = (props) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z" />
  </svg>
);

const MapIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

const ChatIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M20 12a7 7 0 0 1-7 7H9l-4 3v-4.6A7 7 0 0 1 11 5h2a7 7 0 0 1 7 7z" />
  </svg>
);

const WalletIcon = (props) => (
  <svg {...iconProps} {...props}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18M16.5 14.5h.01" />
  </svg>
);

const UsersIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
    <circle cx="10" cy="8" r="3.2" />
    <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.6 5.2a3.2 3.2 0 0 1 0 6.1" />
  </svg>
);

const LogoutIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M15 5h2.5A1.5 1.5 0 0 1 19 6.5v11A1.5 1.5 0 0 1 17.5 19H15" />
    <path d="M10 12h8M15 9l3 3-3 3" />
  </svg>
);

const CopyIcon = (props) => (
  <svg {...iconProps} {...props}>
    <rect x="9" y="9" width="10" height="10" rx="2" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2 2 0 0 0-2 2v6.5A2.5 2.5 0 0 0 6.5 14" />
  </svg>
);

const CheckIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="m5 13 4.5 4.5L19 7" />
  </svg>
);

const MenuIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

const CloseIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const BellIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </svg>
);

const TABS = [
  { id: 'map', label: 'Map', Icon: MapIcon },
  { id: 'chat', label: 'Chat', Icon: ChatIcon },
  { id: 'expenses', label: 'Expenses', Icon: WalletIcon },
  { id: 'members', label: 'Members', Icon: UsersIcon },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [tab, setTab] = useState('map');
  const [myLocation, setMyLocation] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stories, notifications and the map/DM overlays.
  const [storyMap, setStoryMap] = useState({});
  const [toasts, setToasts] = useState([]);
  const [ringing, setRinging] = useState(null);
  const [actionUser, setActionUser] = useState(null);
  const [storyUser, setStoryUser] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [dmUser, setDmUser] = useState(null);

  const groupId = activeGroup?.id ?? null;
  const currentUser = useMemo(
    () =>
      user
        ? { id: user.id, name: user.name, avatarUrl: user.image || user.avatarUrl }
        : null,
    [user]
  );

  // Refs let socket listeners read the latest values without re-subscribing.
  const groupIdRef = useRef(null);
  const dmUserRef = useRef(null);
  const toastId = useRef(0);

  useEffect(() => {
    groupIdRef.current = groupId;
  }, [groupId]);
  useEffect(() => {
    dmUserRef.current = dmUser;
  }, [dmUser]);

  /* ------------------------------------------------------------- toasts */
  const pushToast = useCallback((toast, { timeout = 6000 } = {}) => {
    const id = (toastId.current += 1);
    setToasts((prev) => [...prev, { id, ...toast }].slice(-4));
    if (timeout) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), timeout);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* --------------------------------------------------- audio unlock once */
  useEffect(() => installAudioUnlock(), []);

  /* --------------------------------------------------- restore session */
  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  /* --------------------------------------------------- socket lifecycle */
  useEffect(() => {
    if (!user) return undefined;
    const s = io(API, { withCredentials: true });
    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  /* --------------------------------------- realtime social notifications */
  useEffect(() => {
    if (!socket) return undefined;

    const onVibrate = (payload) => {
      vibrate(payload?.pattern || [220, 90, 220, 90, 420]);
      pushToast({
        icon: '≈',
        title: `${payload?.fromName || 'Someone'} buzzed you`,
        body: 'Vibration alert from your group',
        alert: true,
      });
    };

    const onRing = (payload) => {
      stopRingtone();
      const stop = playRingtone({ duration: 12000 });
      setRinging({ fromName: payload?.fromName || 'Someone', stop });
      pushToast({
        icon: '🔔',
        title: `${payload?.fromName || 'Someone'} is ringing you`,
        body: 'Open the alert bar to stop',
        alert: true,
      });
    };

    const onRingStopped = () => {
      stopRingtone();
      setRinging(null);
    };

    const onDm = (dm) => {
      // Ignore our own echoes and the conversation that is already open.
      if (dm.from_user === currentUser?.id) return;
      if (dmUserRef.current?.userId === dm.from_user) return;
      pushToast({
        icon: '✉',
        title: `Message from ${dm.fromName || 'a member'}`,
        body: dm.message,
      });
    };

    const upsertStory = (story) => {
      if (story.groupId !== groupIdRef.current) return;
      setStoryMap((prev) => {
        const entry =
          prev[story.userId] || {
            userId: story.userId,
            name: story.name,
            avatarUrl: story.avatarUrl,
            items: [],
          };
        const items = entry.items
          .filter((s) => s.id !== story.id)
          .concat(story)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return {
          ...prev,
          [story.userId]: {
            ...entry,
            name: story.name || entry.name,
            avatarUrl: story.avatarUrl || entry.avatarUrl,
            items,
          },
        };
      });
    };

    const onStoryDeleted = ({ id }) => {
      setStoryMap((prev) => {
        const next = {};
        for (const [key, entry] of Object.entries(prev)) {
          const items = entry.items.filter((s) => s.id !== id);
          if (items.length > 0) next[key] = { ...entry, items };
        }
        return next;
      });
    };

    socket.on('vibrate', onVibrate);
    socket.on('ring', onRing);
    socket.on('ring-stopped', onRingStopped);
    socket.on('receive-dm', onDm);
    socket.on('story-updated', upsertStory);
    socket.on('story-deleted', onStoryDeleted);

    return () => {
      socket.off('vibrate', onVibrate);
      socket.off('ring', onRing);
      socket.off('ring-stopped', onRingStopped);
      socket.off('receive-dm', onDm);
      socket.off('story-updated', upsertStory);
      socket.off('story-deleted', onStoryDeleted);
    };
  }, [socket, currentUser?.id, pushToast]);

  /* --------------------------------------------------- load active stories */
  useEffect(() => {
    if (!groupId) {
      setStoryMap({});
      return undefined;
    }
    let active = true;
    api
      .get(`/api/stories/group/${groupId}`)
      .then((res) => {
        if (!active) return;
        const map = {};
        for (const story of res.data || []) {
          if (!map[story.userId]) {
            map[story.userId] = {
              userId: story.userId,
              name: story.name,
              avatarUrl: story.avatarUrl,
              items: [],
            };
          }
          map[story.userId].items.push(story);
        }
        setStoryMap(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [groupId]);

  const handleSelectGroup = useCallback((group) => {
    setActiveGroup(group);
    setGroupMembers({});
    setTab('map');
    setSidebarOpen(false);
  }, []);

  // Let Escape dismiss the phone drawer.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  /* --------------------------------------- GPS + realtime location stream */
  useEffect(() => {
    if (!socket || !currentUser || groupId == null) return undefined;

    setGroupMembers({});
    socket.emit('join-group', { groupId });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          groupId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setMyLocation({
          ...coords,
          userId: currentUser.id,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
        });

        socket.emit('update-location', coords);
      },
      (err) => console.error('GPS Error:', err),
      { enableHighAccuracy: true }
    );

    socket.on('user-moved', (data) => {
      if (data.userId === currentUser.id) return;
      setGroupMembers((prev) => ({ ...prev, [data.userId]: data }));
    });

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      socket.off('user-moved');
    };
  }, [socket, currentUser, groupId]);

  const handleAuthed = (u) => {
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore
    }
    stopRingtone();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setSocket(null);
    setActiveGroup(null);
    setMyLocation(null);
    setGroupMembers({});
    setStoryMap({});
    setToasts([]);
    setRinging(null);
  };

  const copyInvite = async () => {
    if (!activeGroup?.invite_code) return;
    try {
      await navigator.clipboard.writeText(activeGroup.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  /* ------------------------------------------------- map action dispatch */
  const openStory = useCallback(
    (member) => {
      const entry = storyMap[member.userId];
      if (!entry || entry.items.length === 0) {
        pushToast({ icon: '◎', title: 'No active story', body: `${member.name} has no story right now` });
        return;
      }
      setStoryUser({
        userId: member.userId,
        name: entry.name || member.name,
        avatarUrl: entry.avatarUrl || member.avatarUrl,
      });
    },
    [storyMap, pushToast]
  );

  const handleAction = useCallback(
    (type, member) => {
      if (!member?.userId) return;

      if (type === 'story') {
        openStory(member);
        return;
      }
      if (type === 'dm') {
        setActionUser(null);
        setDmUser(member);
        return;
      }
      if (type === 'sheet') {
        setActionUser(member);
        return;
      }
      if (type === 'vibrate') {
        socket?.emit('vibrate-user', { toUserId: member.userId, groupId: groupIdRef.current });
        vibrate(60);
        pushToast({ icon: '≈', title: `Buzzed ${member.name}`, body: 'Vibration sent' });
        return;
      }
      if (type === 'ring') {
        socket?.emit('ring-user', { toUserId: member.userId, groupId: groupIdRef.current });
        pushToast({ icon: '🔔', title: `Ringing ${member.name}`, body: 'Alert sent to their device' });
      }
    },
    [socket, openStory, pushToast]
  );

  const stopRinging = useCallback(() => {
    ringing?.stop?.();
    stopRingtone();
    setRinging(null);
  }, [ringing]);

  const sheetDistance = useMemo(() => {
    if (!actionUser || !myLocation || actionUser.userId === currentUser?.id) return '';
    return formatDistance(distanceMeters(myLocation, actionUser));
  }, [actionUser, myLocation, currentUser?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-mono-950">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-mono-800 bg-mono-900 text-white shadow-glow">
          <CompassIcon className="h-7 w-7 animate-spin [animation-duration:2.4s]" />
        </div>
        <p className="text-sm font-medium text-mono-400">Loading your trips…</p>
      </div>
    );
  }

  if (!user || !currentUser) {
    return <AuthForm onAuthed={handleAuthed} />;
  }

  return (
    <div className="app-shell flex w-full overflow-hidden bg-mono-950 text-mono-200">
      {/* Phone: backdrop behind the trip drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 animate-fade-in bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — static on desktop, slide-over drawer on phones */}
      <aside
        id="trip-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-[19rem] max-w-[85vw] shrink-0 flex-col border-r border-mono-800 bg-mono-900 transition-transform duration-300 ease-out md:static md:z-auto md:w-80 md:max-w-none md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-mono-800 px-4 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-mono-950">
            <CompassIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold tracking-tight text-white">
              Trip Tracker
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-mono-500">
              Live group travel
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="btn btn-ghost p-2 md:hidden"
            aria-label="Close trips"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-mono-800 px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl border border-mono-800 bg-mono-850 p-2.5">
            <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
              <p className="truncate text-xs text-mono-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="btn btn-ghost btn-sm"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <GroupManager userId={currentUser.id} onSelectGroup={handleSelectGroup} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Phone app bar */}
        <header className="flex shrink-0 items-center gap-1 border-b border-mono-800 bg-mono-900 px-2.5 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="btn btn-ghost p-2"
            aria-label="Open trips"
            aria-expanded={sidebarOpen}
            aria-controls="trip-sidebar"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-white">
              {activeGroup ? activeGroup.name : 'Trip Tracker'}
            </p>
            <p className="truncate text-[11px] text-mono-500">
              {activeGroup ? `Invite ${activeGroup.invite_code}` : 'Live group travel'}
            </p>
          </div>
          {activeGroup && (
            <button
              type="button"
              onClick={copyInvite}
              className="btn btn-ghost p-2"
              title="Copy invite code"
              aria-label="Copy invite code"
            >
              {copied ? <CheckIcon className="h-5 w-5 text-accent" /> : <CopyIcon className="h-5 w-5" />}
            </button>
          )}
        </header>

        {!activeGroup ? (
          <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
            <div className="card animate-fade-up w-full max-w-md p-6 text-center sm:p-8">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-mono-950">
                <CompassIcon className="h-8 w-8" />
              </span>
              <h2 className="mt-5 text-xl font-extrabold text-white">
                Welcome to Trip Tracker
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mono-400">
                Select a trip from the trip list, create a new one, or join with an invite code to
                start sharing locations, stories, expenses, and messages.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-semibold text-mono-300">
                <span className="chip chip-slate">Live map</span>
                <span className="chip chip-slate">Distance lines</span>
                <span className="chip chip-slate">Stories</span>
                <span className="chip chip-slate">Split expenses</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="btn btn-primary mt-6 w-full md:hidden"
              >
                Choose a trip
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <header className="hidden flex-wrap items-center gap-3 border-b border-mono-800 bg-mono-900/80 px-5 py-3 backdrop-blur md:flex">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold text-white">{activeGroup.name}</h1>
                <button
                  type="button"
                  onClick={copyInvite}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-mono-800 bg-mono-850 px-2.5 py-1 text-xs font-medium text-mono-400 transition hover:border-mono-600 hover:text-white"
                  title="Copy invite code"
                >
                  {copied ? <CheckIcon className="h-3.5 w-3.5 text-accent" /> : <CopyIcon className="h-3.5 w-3.5" />}
                  <span className="font-mono tracking-wider">{activeGroup.invite_code}</span>
                  <span className="text-[10px] uppercase tracking-wide">
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>

              <nav className="ml-auto flex gap-1 rounded-xl border border-mono-800 bg-mono-850 p-1">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`tab ${active ? 'tab-active' : ''}`}
                    >
                      <t.Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </nav>
            </header>

            {/* Active panel */}
            <div className="min-h-0 flex-1 bg-mono-950">
              <div key={tab} className="h-full animate-fade-in">
                {tab === 'map' && (
                  <LiveMap
                    myLocation={myLocation}
                    otherUsers={groupMembers}
                    stories={storyMap}
                    currentUser={currentUser}
                    onAction={handleAction}
                    onAddStory={() => setComposerOpen(true)}
                  />
                )}
                {tab === 'chat' && (
                  <GroupChat socket={socket} groupId={groupId} currentUser={currentUser} />
                )}
                {tab === 'expenses' && (
                  <ExpensePanel groupId={groupId} currentUser={currentUser} />
                )}
                {tab === 'members' && (
                  <MembersPanel
                    groupId={groupId}
                    currentUser={currentUser}
                    stories={storyMap}
                    onViewStory={openStory}
                  />
                )}
              </div>
            </div>

            {/* Phone bottom tab bar */}
            <nav className="flex shrink-0 items-stretch gap-1 border-t border-mono-800 bg-mono-900/95 px-1.5 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur md:hidden">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${
                      active ? 'bg-white text-mono-950' : 'text-mono-400'
                    }`}
                  >
                    <t.Icon className="h-5 w-5" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </>
        )}
      </main>

      {/* ------------------------------------------------------- overlays */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {ringing && (
        <div className="fixed inset-x-0 bottom-20 z-[2900] flex justify-center px-3 md:bottom-6">
          <div className="alert-shake flex items-center gap-3 rounded-2xl border border-mono-700 bg-mono-900/95 px-4 py-3 shadow-lift backdrop-blur">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent-300">
              <BellIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-white">
              {ringing.fromName} is ringing you
            </span>
            <button type="button" onClick={stopRinging} className="btn btn-primary btn-sm">
              Stop
            </button>
          </div>
        </div>
      )}

      {actionUser && (
        <MemberActionSheet
          member={actionUser}
          distanceText={sheetDistance}
          hasStory={Boolean(storyMap[actionUser.userId])}
          isMe={actionUser.userId === currentUser.id}
          onClose={() => setActionUser(null)}
          onViewStory={() => {
            openStory(actionUser);
            setActionUser(null);
          }}
          onMessage={() => {
            setDmUser(actionUser);
            setActionUser(null);
          }}
          onVibrate={() => {
            handleAction('vibrate', actionUser);
            setActionUser(null);
          }}
          onRing={() => {
            handleAction('ring', actionUser);
            setActionUser(null);
          }}
        />
      )}

      {storyUser && (
        <StoryViewer
          user={storyUser}
          stories={storyMap[storyUser.userId]?.items || []}
          onClose={() => setStoryUser(null)}
        />
      )}

      {composerOpen && activeGroup && (
        <StoryComposer
          socket={socket}
          groupId={groupId}
          onClose={() => setComposerOpen(false)}
          onPosted={() => pushToast({ icon: '◎', title: 'Story posted', body: 'Visible to your trip for 24h' })}
        />
      )}

      {dmUser && (
        <DirectMessages
          socket={socket}
          groupId={groupId}
          otherUser={dmUser}
          currentUser={currentUser}
          onClose={() => setDmUser(null)}
        />
      )}
    </div>
  );
}
