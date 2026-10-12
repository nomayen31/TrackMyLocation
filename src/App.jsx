import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from './api';
import { distanceMeters, formatDistance } from './distance';
import { readInviteToken, clearInviteFromUrl } from './invite';
import useCall from './useCall';
import ExpeditionMap from './components/ExpeditionMap';
import LandingPage from './components/LandingPage';
import QrJoinModal from './components/QrJoinModal';
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
import StoriesBar from './components/StoriesBar';
import DirectMessages from './components/DirectMessages';
import CallOverlay from './components/CallOverlay';
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

/** Group a flat story list into `{ [userId]: { userId, name, avatarUrl, items } }`. */
function groupStories(list) {
  const map = {};
  for (const story of list) {
    if (!map[story.userId]) {
      map[story.userId] = {
        userId: story.userId,
        name: story.name,
        avatarUrl: story.avatarUrl,
        items: [],
      };
    }
    map[story.userId].items.push(story);
    map[story.userId].name = story.name || map[story.userId].name;
    map[story.userId].avatarUrl = story.avatarUrl || map[story.userId].avatarUrl;
  }
  return map;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [tab, setTab] = useState('map');
  const [myLocation, setMyLocation] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [memberList, setMemberList] = useState([]);
  const [groupsRefresh, setGroupsRefresh] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Landing → auth → onboarding flow.
  const [view, setView] = useState('landing'); // 'landing' | 'auth'
  const [authIntent, setAuthIntent] = useState(null); // 'create' | 'join' | null
  const [qrJoinOpen, setQrJoinOpen] = useState(false);
  const [createSignal, setCreateSignal] = useState(0);
  const invited = useMemo(() => Boolean(readInviteToken()), []);

  // Stories, notifications and overlays.
  const [storiesFeed, setStoriesFeed] = useState([]);
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
  const inviteHandled = useRef(false);

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

  /* ----------------------------------------------------- voice call state */
  const handleCallNotice = useCallback(
    (message) => pushToast({ icon: '☏', title: message }),
    [pushToast]
  );
  const callOptions = useMemo(() => ({ onNotice: handleCallNotice }), [handleCallNotice]);
  const call = useCall(socket, currentUser, callOptions);

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

  /* --------------------------------------------------------------- stories */
  const refreshStories = useCallback(async () => {
    try {
      const res = await api.get('/api/stories/feed');
      setStoriesFeed(res.data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user) refreshStories();
  }, [user, groupId, refreshStories]);

  // All visible stories grouped by author (drives the rail + viewer)…
  const storyMap = useMemo(() => groupStories(storiesFeed), [storiesFeed]);
  // …and the subset for the active trip (drives map rings + members list).
  const groupStoryMap = useMemo(
    () => groupStories(storiesFeed.filter((s) => Number(s.groupId) === Number(groupId))),
    [storiesFeed, groupId]
  );

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
      if (dm.from_user === currentUser?.id) return;
      if (dmUserRef.current?.userId === dm.from_user) return;
      pushToast({
        icon: '✉',
        title: `Message from ${dm.fromName || 'a member'}`,
        body: dm.attachment_type && !dm.message ? 'Sent an attachment' : dm.message,
      });
    };

    const onGroupUpdated = (payload) => {
      if (Number(payload?.groupId) !== Number(groupIdRef.current)) return;
      api.get(`/api/groups/${payload.groupId}/members`).then((res) => setMemberList(res.data || [])).catch(() => {});
    };

    const onRemoved = ({ groupId: removedId }) => {
      if (Number(removedId) !== Number(groupIdRef.current)) return;
      setActiveGroup(null);
      setGroupMembers({});
      setMemberList([]);
      setGroupsRefresh((n) => n + 1);
      pushToast({ icon: '⚠', title: 'You were removed from a trip', body: 'An admin removed you.' });
    };

    // SOS: an expedition member needs help — alert hard (sound + vibration).
    const onSos = (payload) => {
      vibrate([400, 120, 400, 120, 700]);
      stopRingtone();
      playRingtone({ duration: 9000 });
      pushToast({
        icon: '🆘',
        title: `SOS from ${payload?.fromName || 'a member'}`,
        body: payload?.message || 'Needs help',
        alert: true,
      }, { timeout: 15000 });
    };
    const onSosSent = () => pushToast({ icon: '🆘', title: 'SOS sent', body: 'Your group has been alerted.' });
    const onSosCleared = (payload) =>
      pushToast({ icon: '✓', title: 'SOS cleared', body: `${payload?.fromUserId ? 'A member' : 'The group'} is safe now.` });

    socket.on('vibrate', onVibrate);
    socket.on('ring', onRing);
    socket.on('ring-stopped', onRingStopped);
    socket.on('receive-dm', onDm);
    socket.on('group-updated', onGroupUpdated);
    socket.on('removed-from-group', onRemoved);
    socket.on('sos', onSos);
    socket.on('sos-sent', onSosSent);
    socket.on('sos-cleared', onSosCleared);
    socket.on('story-updated', refreshStories);
    socket.on('story-deleted', refreshStories);

    return () => {
      socket.off('vibrate', onVibrate);
      socket.off('ring', onRing);
      socket.off('ring-stopped', onRingStopped);
      socket.off('receive-dm', onDm);
      socket.off('group-updated', onGroupUpdated);
      socket.off('removed-from-group', onRemoved);
      socket.off('sos', onSos);
      socket.off('sos-sent', onSosSent);
      socket.off('sos-cleared', onSosCleared);
      socket.off('story-updated', refreshStories);
      socket.off('story-deleted', refreshStories);
    };
  }, [socket, currentUser?.id, pushToast, refreshStories]);

  // Ring the device while a call is incoming.
  useEffect(() => {
    if (call.state !== 'incoming') return undefined;
    const stop = playRingtone({ duration: 30000 });
    return () => {
      stop();
      stopRingtone();
    };
  }, [call.state]);

  /* ------------------------------------------------- group members list */
  useEffect(() => {
    if (!groupId) {
      setMemberList([]);
      return undefined;
    }
    let active = true;
    api
      .get(`/api/groups/${groupId}/members`)
      .then((res) => active && setMemberList(res.data || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [groupId, groupsRefresh]);

  /* --------------------------------------- auto-join via invite link / QR */
  const handleSelectGroup = useCallback((group) => {
    setActiveGroup(group);
    setGroupMembers({});
    setTab('map');
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (!user || inviteHandled.current) return;
    const token = readInviteToken();
    if (!token) return;
    inviteHandled.current = true;

    api
      .post(`/api/groups/invite/${encodeURIComponent(token)}/join`)
      .then((res) => {
        const group = res.data.group;
        clearInviteFromUrl();
        setGroupsRefresh((n) => n + 1);
        pushToast({
          icon: '🧭',
          title: res.data.alreadyMember ? `Already in ${group.name}` : `Joined ${group.name}`,
          body: 'Trip added to your list',
        });
        if (group) handleSelectGroup(group);
      })
      .catch((err) => {
        clearInviteFromUrl();
        pushToast({
          icon: '⚠',
          title: 'Invite failed',
          body: err.response?.data?.error || 'This invite link is invalid',
        });
      });
  }, [user, pushToast, handleSelectGroup]);

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
      socket.emit('leave-group', { groupId });
    };
  }, [socket, currentUser, groupId]);

  const handleAuthed = (u) => {
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    // Apply the landing-page intent that sent us here.
    if (authIntent === 'create') setCreateSignal((n) => n + 1);
    if (authIntent === 'join' && !readInviteToken()) setQrJoinOpen(true);
    setAuthIntent(null);
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
    setStoriesFeed([]);
    setMemberList([]);
    setToasts([]);
    setRinging(null);
    setView('landing');
    setAuthIntent(null);
    setQrJoinOpen(false);
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

  /* --------------------------------------------------- story interactions */
  const openStory = useCallback(
    (target) => {
      const userId = typeof target === 'string' ? target : target?.userId;
      if (!userId) return;
      const entry = storyMap[userId];
      if (!entry || entry.items.length === 0) {
        pushToast({
          icon: '◎',
          title: 'No active story',
          body: `${target?.name || 'They'} have nothing up right now`,
        });
        return;
      }
      setStoryUser({ userId, name: entry.name, avatarUrl: entry.avatarUrl });
    },
    [storyMap, pushToast]
  );

  const handleDeleteStory = useCallback(
    async (id) => {
      try {
        await api.delete(`/api/stories/${id}`);
        await refreshStories();
        setStoryUser(null);
        pushToast({ icon: '🗑', title: 'Story deleted' });
      } catch {
        pushToast({ icon: '⚠', title: 'Could not delete story' });
      }
    },
    [refreshStories, pushToast]
  );

  /* ------------------------------------------------- map action dispatch */
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
      if (type === 'call') {
        setActionUser(null);
        call.startCall(member, groupIdRef.current);
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
    [socket, openStory, pushToast, call]
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
    if (view === 'landing') {
      return (
        <LandingPage
          invited={invited}
          onStart={(mode) => {
            setAuthIntent(mode);
            setView('auth');
          }}
          onSignIn={() => {
            setAuthIntent(null);
            setView('auth');
          }}
        />
      );
    }
    return (
      <div className="relative">
        <AuthForm onAuthed={handleAuthed} />
        <button
          type="button"
          onClick={() => setView('landing')}
          className="fixed left-4 top-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-3.5 w-3.5">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back to home
        </button>
      </div>
    );
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
            <p className="truncate text-sm font-extrabold tracking-tight text-white">Trip Tracker</p>
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
            <button type="button" onClick={handleLogout} title="Log out" aria-label="Log out" className="btn btn-ghost btn-sm">
              <LogoutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <GroupManager
            userId={currentUser.id}
            onSelectGroup={handleSelectGroup}
            refreshSignal={groupsRefresh}
            createSignal={createSignal}
          />
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
            <button type="button" onClick={copyInvite} className="btn btn-ghost p-2" title="Copy invite code" aria-label="Copy invite code">
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
              <h2 className="mt-5 text-xl font-extrabold text-white">Welcome to Trip Tracker</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mono-400">
                Select a trip from the trip list, create a new one, or scan an invite QR to start
                sharing locations, stories, media, and calls.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-semibold text-mono-300">
                <span className="chip chip-slate">Live map</span>
                <span className="chip chip-slate">QR invites</span>
                <span className="chip chip-slate">Stories</span>
                <span className="chip chip-slate">Voice calls</span>
              </div>
              <button type="button" onClick={() => setSidebarOpen(true)} className="btn btn-primary mt-6 w-full md:hidden">
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
                  <span className="text-[10px] uppercase tracking-wide">{copied ? 'Copied' : 'Copy'}</span>
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
                  <div className="flex h-full min-h-0 flex-col">
                    <StoriesBar
                      stories={storiesFeed}
                      currentUser={currentUser}
                      onOpen={openStory}
                      onAdd={() => setComposerOpen(true)}
                    />
                    <div className="min-h-0 flex-1">
                      <ExpeditionMap
                        groupName={activeGroup?.name}
                        myLocation={myLocation}
                        otherUsers={groupMembers}
                        stories={groupStoryMap}
                        currentUser={currentUser}
                        socket={socket}
                        groupId={groupId}
                        onAction={handleAction}
                        onAddStory={() => setComposerOpen(true)}
                      />
                    </div>
                  </div>
                )}
                {tab === 'chat' && <GroupChat socket={socket} groupId={groupId} currentUser={currentUser} />}
                {tab === 'expenses' && <ExpensePanel groupId={groupId} currentUser={currentUser} />}
                {tab === 'members' && (
                  <MembersPanel
                    groupId={groupId}
                    currentUser={currentUser}
                    stories={groupStoryMap}
                    onViewStory={openStory}
                    socket={socket}
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
      <CallOverlay call={call} />

      {ringing && (
        <div className="fixed inset-x-0 bottom-20 z-[2900] flex justify-center px-3 md:bottom-6">
          <div className="alert-shake flex items-center gap-3 rounded-2xl border border-mono-700 bg-mono-900/95 px-4 py-3 shadow-lift backdrop-blur">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent-300">
              <BellIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-white">{ringing.fromName} is ringing you</span>
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
          onCall={() => {
            call.startCall(actionUser, groupId);
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
          currentUser={currentUser}
          onClose={() => setStoryUser(null)}
          onViewed={refreshStories}
          onDelete={handleDeleteStory}
        />
      )}

      {composerOpen && activeGroup && (
        <StoryComposer
          socket={socket}
          groupId={groupId}
          members={memberList}
          currentUser={currentUser}
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            refreshStories();
            pushToast({ icon: '◎', title: 'Story posted' });
          }}
        />
      )}

      {dmUser && (
        <DirectMessages
          socket={socket}
          groupId={groupId}
          otherUser={dmUser}
          currentUser={currentUser}
          onClose={() => setDmUser(null)}
          onCall={(member) => call.startCall(member, groupId)}
        />
      )}

      {qrJoinOpen && (
        <QrJoinModal
          onClose={() => setQrJoinOpen(false)}
          onJoined={(group, alreadyMember) => {
            setGroupsRefresh((n) => n + 1);
            if (group) handleSelectGroup(group);
            pushToast({
              icon: '🧭',
              title: alreadyMember ? `Already in ${group?.name || 'this trip'}` : `Joined ${group?.name || 'the trip'}`,
              body: 'Trip added to your list',
            });
          }}
        />
      )}
    </div>
  );
}
