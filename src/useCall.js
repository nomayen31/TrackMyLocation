import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useCall — free 1-to-1 WebRTC voice calls with Socket.IO signalling.
 *
 * Signalling events (see Backend/src/sockets/callSocket.js):
 *   emit  call-user | accept-call | reject-call | ice-candidate | hang-up
 *   on    incoming-call | call-accepted | call-rejected | ice-candidate | call-ended
 *
 * Audio is peer-to-peer via RTCPeerConnection. STUN is Google's free public
 * server; add a TURN server (VITE_TURN_*) for restrictive mobile networks.
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const turnUrl = import.meta.env.VITE_TURN_URL;
if (turnUrl) {
  ICE_SERVERS.push({
    urls: turnUrl,
    username: import.meta.env.VITE_TURN_USER,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}

const RING_TIMEOUT_MS = 45_000;

const newCallId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function useCall(socket, currentUser, { onNotice } = {}) {
  // idle | calling | incoming | active | ended
  const [state, setState] = useState('idle');
  const [peer, setPeer] = useState(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState('');

  const pc = useRef(null);
  const localStream = useRef(null);
  const callId = useRef(null);
  const peerId = useRef(null);
  const isCaller = useRef(false);
  const pendingIce = useRef([]);
  const pendingOffer = useRef(null);
  const timer = useRef(null);
  const startedAt = useRef(0);
  const ringTimer = useRef(null);
  const stateRef = useRef('idle');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearTimers = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
  };

  const startTimer = () => {
    if (timer.current) clearInterval(timer.current);
    // Derive the duration from a timestamp so it stays accurate after the tab
    // has been backgrounded (mobile browsers throttle timers).
    startedAt.current = Date.now();
    setSeconds(0);
    timer.current = setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000
    );
  };

  /** Tear everything down; optionally park in 'ended' so the UI can fade out. */
  const teardown = useCallback((nextState = 'idle') => {
    clearTimers();
    if (pc.current) {
      try {
        pc.current.onicecandidate = null;
        pc.current.ontrack = null;
        pc.current.close();
      } catch {
        /* already closed */
      }
      pc.current = null;
    }
    if (localStream.current) {
      try {
        localStream.current.getTracks().forEach((t) => t.stop());
      } catch {
        /* already stopped */
      }
      localStream.current = null;
    }
    pendingIce.current = [];
    pendingOffer.current = null;
    callId.current = null;
    peerId.current = null;
    isCaller.current = false;
    setRemoteStream(null);
    setMuted(false);
    setSeconds(0);
    setPeer(null);
    setState(nextState);
  }, []);

  const getMedia = useCallback(async () => {
    if (localStream.current) return localStream.current;
    // Real noise cancellation: the browser's WebRTC DSP removes background
    // noise, echo and level differences. Supported on Chrome, Edge, Safari.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      },
      video: false,
    });
    localStream.current = stream;
    return stream;
  }, []);

  const createPc = useCallback(async () => {
    if (pc.current) return pc.current;

    const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const stream = await getMedia();
    stream.getTracks().forEach((track) => conn.addTrack(track, stream));

    conn.onicecandidate = (event) => {
      if (event.candidate && peerId.current && callId.current) {
        socket.emit('ice-candidate', {
          toUserId: peerId.current,
          callId: callId.current,
          candidate: event.candidate,
        });
      }
    };

    // Remote audio arrives here -> played by the overlay's hidden <audio>.
    conn.ontrack = (event) => setRemoteStream(event.streams[0] || null);
    conn.onconnectionstatechange = () => {
      if (stateRef.current !== 'active') return;
      if (['failed', 'closed'].includes(conn.connectionState)) {
        onNotice?.('Call disconnected');
        teardown('ended');
        setTimeout(() => setState((s) => (s === 'ended' ? 'idle' : s)), 1200);
      }
    };

    pc.current = conn;
    return conn;
  }, [getMedia, socket, onNotice, teardown]);

  /** ICE candidates that arrive before the remote description is applied. */
  const flushIce = useCallback(async (conn) => {
    const queued = pendingIce.current;
    pendingIce.current = [];
    for (const candidate of queued) {
      try {
        await conn.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore malformed candidates */
      }
    }
  }, []);

  /* ------------------------------------------------------------------ actions */
  const startCall = useCallback(
    async (member, groupId) => {
      if (!socket || !member?.userId) return;
      if (stateRef.current !== 'idle') {
        onNotice?.('You are already in a call');
        return;
      }

      let stream;
      try {
        stream = await getMedia();
      } catch {
        setError('Microphone permission denied.');
        onNotice?.('Microphone permission denied.');
        return;
      }

      callId.current = newCallId();
      peerId.current = member.userId;
      isCaller.current = true;
      setPeer(member);
      setError('');
      setState('calling');

      try {
        const conn = await createPc();
        const offer = await conn.createOffer({ offerToReceiveAudio: true });
        await conn.setLocalDescription(offer);

        socket.emit('call-user', {
          toUserId: member.userId,
          groupId: groupId ?? null,
          callId: callId.current,
          callType: 'audio',
          offer: conn.localDescription,
        });

        // Give up if nobody picks up.
        ringTimer.current = setTimeout(() => {
          if (stateRef.current === 'calling') {
            socket.emit('hang-up', { toUserId: peerId.current, callId: callId.current, reason: 'no-answer' });
            onNotice?.('No answer');
            teardown('ended');
            setTimeout(() => setState((s) => (s === 'ended' ? 'idle' : s)), 1200);
          }
        }, RING_TIMEOUT_MS);
      } catch {
        setError('Could not start the call.');
        teardown('ended');
      }

      void stream;
    },
    [socket, getMedia, createPc, onNotice, teardown]
  );

  const accept = useCallback(async () => {
    if (!peerId.current || !callId.current || !pendingOffer.current) return;
    try {
      const conn = await createPc();
      await conn.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);
      await flushIce(conn);

      socket.emit('accept-call', {
        toUserId: peerId.current,
        callId: callId.current,
        answer: conn.localDescription,
      });

      setState('active');
      startTimer();
    } catch {
      setError('Could not answer the call.');
      socket.emit('reject-call', { toUserId: peerId.current, callId: callId.current, reason: 'error' });
      teardown();
    }
  }, [createPc, flushIce, socket, teardown]);

  const reject = useCallback(() => {
    if (peerId.current && callId.current) {
      socket.emit('reject-call', {
        toUserId: peerId.current,
        callId: callId.current,
        reason: 'declined',
      });
    }
    teardown();
  }, [socket, teardown]);

  const hangup = useCallback(() => {
    if (peerId.current && callId.current) {
      socket.emit('hang-up', {
        toUserId: peerId.current,
        callId: callId.current,
        reason: 'ended',
      });
    }
    teardown('ended');
    setTimeout(() => setState((s) => (s === 'ended' ? 'idle' : s)), 1200);
  }, [socket, teardown]);

  const toggleMute = useCallback(() => {
    const stream = localStream.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  /* ------------------------------------------------------- signalling wiring */
  useEffect(() => {
    if (!socket) return undefined;

    const onIncoming = ({ fromUserId, fromName, fromAvatar, callId: cid, offer }) => {
      if (stateRef.current !== 'idle') {
        socket.emit('reject-call', { toUserId: fromUserId, callId: cid, reason: 'busy' });
        return;
      }
      callId.current = cid;
      peerId.current = fromUserId;
      isCaller.current = false;
      pendingOffer.current = offer || null;
      setPeer({ userId: fromUserId, name: fromName, avatarUrl: fromAvatar, callId: cid });
      setState('incoming');
    };

    const onAccepted = async ({ answer } = {}) => {
      const conn = pc.current;
      if (!conn || !answer) return;
      try {
        await conn.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIce(conn);
        setState('active');
        startTimer();
      } catch {
        onNotice?.('Call failed to connect');
        teardown('ended');
      }
    };

    const onIce = async ({ candidate } = {}) => {
      const conn = pc.current;
      if (!conn || !candidate) return;
      if (!conn.remoteDescription) {
        pendingIce.current.push(candidate);
        return;
      }
      try {
        await conn.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
      }
    };

    const finish = (message) => {
      if (message) onNotice?.(message);
      teardown('ended');
      setTimeout(() => setState((s) => (s === 'ended' ? 'idle' : s)), 1200);
    };

    const onRejected = ({ reason } = {}) =>
      finish(reason === 'busy' ? 'User is on another call' : 'Call declined');
    const onEnded = () => finish('Call ended');

    socket.on('incoming-call', onIncoming);
    socket.on('call-accepted', onAccepted);
    socket.on('call-rejected', onRejected);
    socket.on('ice-candidate', onIce);
    socket.on('call-ended', onEnded);
    // Legacy events (older clients)
    socket.on('call:answer', onAccepted);
    socket.on('call:ice', onIce);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('incoming-call', onIncoming);
      socket.off('call-accepted', onAccepted);
      socket.off('call-rejected', onRejected);
      socket.off('ice-candidate', onIce);
      socket.off('call-ended', onEnded);
      socket.off('call:answer', onAccepted);
      socket.off('call:ice', onIce);
      socket.off('call:ended', onEnded);
    };
  }, [socket, flushIce, teardown, onNotice]);

  return {
    state,
    peer,
    muted,
    seconds,
    error,
    remoteStream,
    startCall,
    accept,
    reject,
    hangup,
    toggleMute,
  };
}
