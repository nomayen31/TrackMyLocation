import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useCall — 1:1 voice calls over WebRTC with Socket.IO signalling.
 *
 * Server relays signalling only (see Backend/src/sockets/callSocket.js); audio
 * is peer-to-peer. STUN is provided by Google's public servers. For restrictive
 * NATs, set VITE_TURN_URL / VITE_TURN_USER / VITE_TURN_CREDENTIAL and a TURN
 * server is added automatically.
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
  const timer = useRef(null);
  const stateRef = useRef('idle');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stopTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    setSeconds(0);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  /** Tear down all call state; optionally park in 'ended' for the UI. */
  const teardown = useCallback((nextState = 'idle') => {
    stopTimer();
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
        localStream.current.getTracks().forEach((track) => track.stop());
      } catch {
        /* already stopped */
      }
      localStream.current = null;
    }
    pendingIce.current = [];
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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
        socket.emit('call:ice', {
          toUserId: peerId.current,
          callId: callId.current,
          candidate: event.candidate,
        });
      }
    };
    conn.ontrack = (event) => setRemoteStream(event.streams[0] || null);

    pc.current = conn;
    return conn;
  }, [getMedia, socket]);

  /** Apply ICE candidates that arrived before the remote description. */
  const flushIce = useCallback(async (conn) => {
    const queued = pendingIce.current;
    pendingIce.current = [];
    for (const candidate of queued) {
      try {
        await conn.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
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
      try {
        await getMedia();
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

      socket.emit('call:invite', {
        toUserId: member.userId,
        groupId: groupId ?? null,
        callId: callId.current,
        callType: 'audio',
      });
    },
    [socket, getMedia, onNotice]
  );

  const accept = useCallback(async () => {
    if (!peerId.current || !callId.current) return;
    try {
      await createPc();
    } catch {
      setError('Microphone permission denied.');
      teardown();
      return;
    }
    socket.emit('call:accept', { toUserId: peerId.current, callId: callId.current });
    setState('active');
    startTimer();
  }, [createPc, socket, teardown]);

  const reject = useCallback(() => {
    if (peerId.current && callId.current) {
      socket.emit('call:reject', {
        toUserId: peerId.current,
        callId: callId.current,
        reason: 'declined',
      });
    }
    teardown();
  }, [socket, teardown]);

  const hangup = useCallback(() => {
    if (peerId.current && callId.current) {
      socket.emit('call:end', {
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

    const onIncoming = ({ fromUserId, fromName, fromAvatar, callId: cid }) => {
      if (stateRef.current !== 'idle') {
        socket.emit('call:reject', { toUserId: fromUserId, callId: cid, reason: 'busy' });
        return;
      }
      callId.current = cid;
      peerId.current = fromUserId;
      isCaller.current = false;
      setPeer({ userId: fromUserId, name: fromName, avatarUrl: fromAvatar });
      setState('incoming');
    };

    const onAccepted = async () => {
      if (!isCaller.current) return;
      try {
        const conn = await createPc();
        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);
        socket.emit('call:offer', {
          toUserId: peerId.current,
          callId: callId.current,
          sdp: conn.localDescription,
        });
        setState('active');
        startTimer();
      } catch {
        setError('Could not start the call.');
        teardown('ended');
      }
    };

    const onOffer = async ({ sdp } = {}) => {
      if (!sdp) return;
      const conn = await createPc();
      await conn.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);
      socket.emit('call:answer', {
        toUserId: peerId.current,
        callId: callId.current,
        sdp: conn.localDescription,
      });
      await flushIce(conn);
      setState('active');
      startTimer();
    };

    const onAnswer = async ({ sdp } = {}) => {
      const conn = pc.current;
      if (!conn || !sdp) return;
      await conn.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushIce(conn);
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

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
    };
  }, [socket, createPc, flushIce, teardown, onNotice]);

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
