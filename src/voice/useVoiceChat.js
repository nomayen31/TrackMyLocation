import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';

/**
 * useVoiceChat — Discord-style group voice rooms.
 *
 * Responsibilities
 *  - talks the `voice:*` Socket.IO protocol (presence, invites, mute, tokens)
 *  - connects to LiveKit for the actual audio (microphone publish + subscribe)
 *  - tracks speaking via LiveKit's `ActiveSpeakersChanged` (never by shipping
 *    audio through Socket.IO)
 *
 * Presence (app-level) and LiveKit membership (media-level) are kept separate
 * and reconciled: Socket.IO decides who is *in the room*, LiveKit decides who is
 * actually *publishing audio*.
 *
 * @param {import('socket.io-client').Socket|null} socket the app's shared socket
 * @param {object} currentUser { id, name, avatarUrl }
 */
export default function useVoiceChat(socket, currentUser) {
  const [rooms, setRooms] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [connectionState, setConnectionState] = useState('idle'); // idle|connecting|connected|reconnecting|disconnected
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState([]); // user ids
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);

  const roomRef = useRef(null); // LiveKit Room
  const activeRoomRef = useRef(null); // { id, name, ... } for reconnect logic
  const mutedRef = useRef(false);
  const audioContainerRef = useRef(null); // hidden <div> holding remote audio

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  /* ---------------------------------------------------------- ack helper */
  const emitAck = useCallback(
    (event, payload) =>
      new Promise((resolve) => {
        if (!socket) {
          resolve({ ok: false, error: { code: 'NO_SOCKET', message: 'Not connected' } });
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve({ ok: false, error: { code: 'TIMEOUT', message: 'The server did not respond' } });
          }
        }, 15000);
        socket.emit(event, payload, (res) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(res || { ok: false, error: { code: 'NO_ACK', message: 'No response' } });
        });
      }),
    [socket]
  );

  const fail = useCallback((res, fallback = 'Something went wrong') => {
    const message = res?.error?.message || fallback;
    setError(message);
    return res;
  }, []);

  /* ------------------------------------------------------ room list / invites */
  const refreshRooms = useCallback(
    async () => {
      if (!socket) return;
      const res = await emitAck('voice:room:list', {});
      if (res.ok) setRooms(res.rooms || []);
    },
    [socket, emitAck]
  );

  const refreshInvitations = useCallback(async () => {
    if (!socket) return;
    const res = await emitAck('voice:invite:list', {});
    if (res.ok) setInvitations(res.invitations || []);
  }, [socket, emitAck]);

  useEffect(() => {
    if (!socket) return undefined;
    let active = true;
    // Bootstrap: does the backend have LiveKit credentials?
    fetch('http://localhost:5000/api/voice/config', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (active && cfg) setConfigured(Boolean(cfg.configured));
      })
      .catch(() => {});

    refreshRooms();
    refreshInvitations();
    return () => {
      active = false;
    };
  }, [socket, refreshRooms, refreshInvitations]);

  /* ------------------------------------------------------------- livekit */
  const detachRemoteAudio = useCallback(() => {
    const host = audioContainerRef.current;
    if (host) host.innerHTML = '';
  }, []);

  const disconnectLiveKit = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        await room.disconnect();
      } catch {
        /* already gone */
      }
    }
    detachRemoteAudio();
    setSpeaking([]);
  }, [detachRemoteAudio]);

  const syncSpeakers = useCallback((speakers) => {
    setSpeaking(speakers.map((p) => p.identity));
  }, []);

  const connectLiveKit = useCallback(
    async (url, token) => {
      await disconnectLiveKit();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
      });

      room
        .on(RoomEvent.ParticipantConnected, () => setConnectionState('connected'))
        .on(RoomEvent.ActiveSpeakersChanged, syncSpeakers)
        .on(RoomEvent.IsSpeakingChanged, () => {
          // Keep the speaker list fresh even if ActiveSpeakersChanged lags.
          const speakers = [...room.remoteParticipants.values()].filter((p) => p.isSpeaking);
          if (room.localParticipant?.isSpeaking) speakers.push(room.localParticipant);
          setSpeaking(speakers.map((p) => p.identity));
        })
        .on(RoomEvent.ConnectionStateChanged, (state) => {
          const s = String(state);
          if (s === 'connected') setConnectionState('connected');
          else if (s === 'reconnecting') setConnectionState('reconnecting');
          else if (s === 'disconnected') setConnectionState('disconnected');
        })
        .on(RoomEvent.Reconnecting, () => setConnectionState('reconnecting'))
        .on(RoomEvent.Reconnected, () => setConnectionState('connected'))
        .on(RoomEvent.Disconnected, () => {
          setConnectionState('disconnected');
          setSpeaking([]);
        })
        .on(RoomEvent.TrackSubscribed, (track, _pub, _participant) => {
          if (track.kind === 'audio') {
            // Attach into the hidden container so the browser plays it.
            const el = track.attach();
            el.autoplay = true;
            audioContainerRef.current?.appendChild(el);
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove());
        });

      roomRef.current = room;
      setConnectionState('connecting');

      await room.connect(url, token);

      // Join muted if the user asked for that.
      await room.localParticipant.setMicrophoneEnabled(!mutedRef.current);

      setConnectionState('connected');
    },
    [disconnectLiveKit, syncSpeakers]
  );

  /* --------------------------------------------------------------- actions */
  const createRoom = useCallback(
    async ({ name, isPrivate = false, maxParticipants = 8, groupId = null }) => {
      setError('');
      setBusy(true);
      try {
        const res = await emitAck('voice:room:create', { name, isPrivate, maxParticipants, groupId });
        if (!res.ok) {
          fail(res, 'Could not create the room');
          return null;
        }
        await refreshRooms();
        return res.room;
      } finally {
        setBusy(false);
      }
    },
    [emitAck, fail, refreshRooms]
  );

  const joinRoom = useCallback(
    async (roomId, { startMuted = false } = {}) => {
      setError('');
      setBusy(true);
      setMuted(startMuted);
      try {
        const res = await emitAck('voice:room:join', { roomId, muted: startMuted });
        if (!res.ok) {
          fail(res, 'Could not join the room');
          setBusy(false);
          return;
        }
        setActiveRoom(res.room);
        setParticipants(res.participants || []);
        setMuted(Boolean(res.muted));

        if (res.token && res.livekitUrl) {
          try {
            await connectLiveKit(res.livekitUrl, res.token);
          } catch (lkErr) {
            console.error('LiveKit connect failed:', lkErr?.message || lkErr);
            setError('Connected to the room but audio failed to start.');
            setConnectionState('disconnected');
          }
        } else {
          setError('Voice service is not configured on the server.');
        }
      } finally {
        setBusy(false);
      }
    },
    [emitAck, fail, connectLiveKit]
  );

  const leaveRoom = useCallback(async () => {
    const room = activeRoomRef.current;
    setBusy(true);
    try {
      await disconnectLiveKit();
      if (room) await emitAck('voice:room:leave', { roomId: room.id });
      setActiveRoom(null);
      setParticipants([]);
      setSpeaking([]);
      setConnectionState('idle');
      await refreshRooms();
    } finally {
      setBusy(false);
    }
  }, [emitAck, disconnectLiveKit, refreshRooms]);

  const toggleMute = useCallback(async () => {
    const next = !muted;
    setMuted(next);

    // Apply to the actual track first (the source of truth for audio).
    const room = roomRef.current;
    if (room) {
      try {
        await room.localParticipant.setMicrophoneEnabled(!next);
      } catch {
        setError('Microphone unavailable — check browser permissions.');
      }
    }
    // Then advertise the state to the room.
    if (activeRoomRef.current) {
      await emitAck('voice:participant:mute', { roomId: activeRoomRef.current.id, muted: next });
    }
  }, [muted, emitAck]);

  const sendInvite = useCallback(
    async (roomId, recipientId) => {
      const res = await emitAck('voice:invite:send', { roomId, recipientId });
      if (!res.ok) fail(res, 'Could not send the invitation');
      return res;
    },
    [emitAck, fail]
  );

  const acceptInvite = useCallback(
    async (invitationId) => {
      setBusy(true);
      try {
        const res = await emitAck('voice:invite:accept', { invitationId });
        if (!res.ok) {
          fail(res, 'Could not accept the invitation');
          return;
        }
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        setActiveRoom(res.room);
        await refreshRooms();
        if (res.token && res.livekitUrl) {
          try {
            await connectLiveKit(res.livekitUrl, res.token);
          } catch {
            setError('Connected but audio failed to start.');
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [emitAck, fail, connectLiveKit, refreshRooms]
  );

  const declineInvite = useCallback(
    async (invitationId) => {
      const res = await emitAck('voice:invite:decline', { invitationId });
      if (res.ok) setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      else fail(res, 'Could not decline the invitation');
    },
    [emitAck, fail]
  );

  /* ------------------------------------------------- realtime subscriptions */
  useEffect(() => {
    if (!socket) return undefined;

    const onParticipants = ({ roomId, participants: list }) => {
      if (Number(roomId) !== Number(activeRoomRef.current?.id)) return;
      setParticipants(list || []);
    };
    const onJoined = ({ roomId }) => {
      if (Number(roomId) !== Number(activeRoomRef.current?.id)) return;
      refreshRooms();
    };
    const onLeft = ({ roomId }) => {
      if (Number(roomId) !== Number(activeRoomRef.current?.id)) return;
      refreshRooms();
    };
    const onMute = ({ roomId, userId, muted: isMuted }) => {
      if (Number(roomId) !== Number(activeRoomRef.current?.id)) return;
      setParticipants((prev) => prev.map((p) => (p.userId === userId ? { ...p, muted: isMuted } : p)));
    };
    const onRoomUpdated = () => refreshRooms();
    const onInviteReceived = ({ invitation }) => {
      if (!invitation) return;
      setInvitations((prev) => (prev.some((i) => i.id === invitation.id) ? prev : [invitation, ...prev]));
    };
    const onDeleted = ({ roomId }) => {
      if (Number(roomId) !== Number(activeRoomRef.current?.id)) return;
      setError('This room was closed by its owner.');
      disconnectLiveKit();
      setActiveRoom(null);
      setParticipants([]);
      setConnectionState('idle');
      refreshRooms();
    };

    // Recover after a socket reconnect: re-announce presence and re-list.
    const onConnect = () => {
      const room = activeRoomRef.current;
      if (room) {
        emitAck('voice:room:join', { roomId: room.id, muted: mutedRef.current }).then((res) => {
          if (res.ok) {
            setParticipants(res.participants || []);
            setConnectionState('connected');
          }
        });
      }
      refreshRooms();
      refreshInvitations();
    };

    socket.on('voice:room:participants', onParticipants);
    socket.on('voice:participant:joined', onJoined);
    socket.on('voice:participant:left', onLeft);
    socket.on('voice:participant:mute', onMute);
    socket.on('voice:room:updated', onRoomUpdated);
    socket.on('voice:invite:received', onInviteReceived);
    socket.on('voice:room:deleted', onDeleted);
    socket.on('connect', onConnect);

    return () => {
      socket.off('voice:room:participants', onParticipants);
      socket.off('voice:participant:joined', onJoined);
      socket.off('voice:participant:left', onLeft);
      socket.off('voice:participant:mute', onMute);
      socket.off('voice:room:updated', onRoomUpdated);
      socket.off('voice:invite:received', onInviteReceived);
      socket.off('voice:room:deleted', onDeleted);
      socket.off('connect', onConnect);
    };
  }, [socket, emitAck, refreshRooms, refreshInvitations, disconnectLiveKit]);

  /* Best-effort cleanup on unmount / tab close. */
  useEffect(() => {
    const onUnload = () => {
      const room = activeRoomRef.current;
      if (room && socket) socket.emit('voice:room:leave', { roomId: room.id });
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      disconnectLiveKit();
    };
  }, [socket, disconnectLiveKit]);

  const speakingSet = useMemo(() => new Set(speaking), [speaking]);

  return {
    rooms,
    invitations,
    activeRoom,
    participants,
    connectionState,
    muted,
    speakingSet,
    error,
    busy,
    configured,
    audioContainerRef,
    clearError: () => setError(''),
    refreshRooms,
    refreshInvitations,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleMute,
    sendInvite,
    acceptInvite,
    declineInvite,
  };
}
