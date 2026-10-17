import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useMeshVoice — group voice over a WebRTC mesh on the hotspot.
 *
 * Each participant connects directly to every other participant. On a LAN this
 * uses host ICE candidates only: no STUN, no TURN, no internet. Socket.IO is
 * used purely for signalling (offers/answers/ICE) and a "speaking" flag.
 *
 * Speaking detection is done locally with a Web Audio AnalyserNode on each
 * stream, so audio is never sent through Socket.IO.
 */
const SPEAKING_THRESHOLD = 0.035;
const SPEAKING_TICK_MS = 120;

export default function useMeshVoice(socket, self, audioHostRef) {
  const [inCall, setInCall] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [speakingSet, setSpeakingSet] = useState(() => new Set());
  const [muted, setMuted] = useState(false);
  const [connState, setConnState] = useState('idle'); // idle|connecting|connected
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pcs = useRef(new Map()); // peerId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const analysers = useRef(new Map()); // peerId|'self' -> AnalyserNode
  const audioCtxRef = useRef(null);
  const loopRef = useRef(null);
  const speakingRef = useRef(new Set());
  const lastSelfSpeaking = useRef(false);
  const pendingIce = useRef(new Map());
  const inCallRef = useRef(false);
  const mutedRef = useRef(false);

  const selfId = self?.deviceId || '';

  /* ---------------------------------------------------------- audio helpers */
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    audioCtxRef.current?.resume?.().catch(() => {});
    return audioCtxRef.current;
  }

  function addAnalyser(id, stream) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analysers.current.set(id, analyser);
    } catch {
      /* stream not analysable */
    }
  }

  function attachAudio(id, stream) {
    const host = audioHostRef?.current;
    if (!host) return;
    let el = host.querySelector(`audio[data-peer="${id}"]`);
    if (!el) {
      el = document.createElement('audio');
      el.autoplay = true;
      el.playsInline = true;
      el.dataset.peer = id;
      host.appendChild(el);
    }
    el.srcObject = stream;
    el.play?.().catch(() => {});
  }

  function startSpeakingLoop() {
    if (loopRef.current) return;
    const buffer = new Uint8Array(256);

    loopRef.current = setInterval(() => {
      const active = new Set();
      for (const [id, analyser] of analysers.current) {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        if (Math.sqrt(sum / buffer.length) > SPEAKING_THRESHOLD) active.add(id);
      }

      const changed =
        active.size !== speakingRef.current.size ||
        [...active].some((id) => !speakingRef.current.has(id));

      if (changed) {
        speakingRef.current = active;
        setSpeakingSet(new Set(active));

        const selfSpeaking = active.has('self');
        if (selfSpeaking !== lastSelfSpeaking.current) {
          lastSelfSpeaking.current = selfSpeaking;
          socket?.emit('mesh:speaking', { speaking: selfSpeaking });
        }
      }
    }, SPEAKING_TICK_MS);
  }

  /* ---------------------------------------------------------- peer plumbing */
  function closePeer(peerId) {
    const pc = pcs.current.get(peerId);
    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.close();
      } catch {
        /* already closed */
      }
      pcs.current.delete(peerId);
    }
    analysers.current.delete(peerId);
    const host = audioHostRef?.current;
    host?.querySelector(`audio[data-peer="${peerId}"]`)?.remove();
    pendingIce.current.delete(peerId);
  }

  function ensurePeer(peerId) {
    if (pcs.current.has(peerId)) return pcs.current.get(peerId);
    const stream = localStreamRef.current;
    if (!stream) return null;

    const pc = new RTCPeerConnection({ iceServers: [] }); // LAN: host candidates
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('mesh:signal', {
          to: peerId,
          data: { type: 'ice', candidate: event.candidate },
        });
      }
    };
    pc.ontrack = (event) => {
      const remote = event.streams[0];
      if (remote) {
        attachAudio(peerId, remote);
        addAnalyser(peerId, remote);
      }
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) closePeer(peerId);
    };

    pcs.current.set(peerId, pc);
    return pc;
  }

  async function offerTo(peerId) {
    const pc = ensurePeer(peerId);
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('mesh:signal', { to: peerId, data: { type: 'offer', sdp: pc.localDescription } });
  }

  async function flushIce(peerId, pc) {
    const queued = pendingIce.current.get(peerId) || [];
    pendingIce.current.delete(peerId);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
      }
    }
  }

  const handleSignal = useCallback(
    async ({ from, data } = {}) => {
      if (!from || !data) return;
      try {
        if (data.type === 'offer') {
          const pc = ensurePeer(from);
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushIce(from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('mesh:signal', {
            to: from,
            data: { type: 'answer', sdp: pc.localDescription },
          });
        } else if (data.type === 'answer') {
          const pc = pcs.current.get(from);
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushIce(from, pc);
        } else if (data.type === 'ice') {
          const pc = pcs.current.get(from);
          if (!pc) return;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            const q = pendingIce.current.get(from) || [];
            q.push(data.candidate);
            pendingIce.current.set(from, q);
          }
        }
      } catch (err) {
        console.warn('Mesh signal error:', err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socket]
  );

  /* ------------------------------------------------------------ roster wiring */
  useEffect(() => {
    if (!socket) return undefined;

    const onRoster = async ({ participants: list } = {}) => {
      const roster = list || [];
      setParticipants(roster);

      if (inCallRef.current) {
        // Deterministic offerer: the lexicographically smaller device id offers.
        for (const peer of roster) {
          if (
            peer.deviceId !== selfId &&
            !pcs.current.has(peer.deviceId) &&
            selfId < peer.deviceId
          ) {
            await offerTo(peer.deviceId);
          }
        }
      }

      // Close connections for people who left.
      const present = new Set(roster.map((p) => p.deviceId));
      for (const id of [...pcs.current.keys()]) {
        if (!present.has(id)) closePeer(id);
      }
    };

    socket.on('mesh:roster', onRoster);
    socket.on('mesh:signal', handleSignal);

    return () => {
      socket.off('mesh:roster', onRoster);
      socket.off('mesh:signal', handleSignal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, selfId, handleSignal]);

  /* ------------------------------------------------------------------ actions */
  const join = useCallback(async () => {
    if (!socket) return;
    setBusy(true);
    setError('');
    setConnState('connecting');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      setError(
        denied
          ? 'Microphone blocked. Voice needs HTTPS on the hotspot — open the site over https:// and allow the mic.'
          : 'Could not start the microphone on this device.'
      );
      setConnState('idle');
      setBusy(false);
      return;
    }

    localStreamRef.current = stream;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !mutedRef.current;
    });
    addAnalyser('self', stream);

    socket.emit('mesh:join', {}, async (res) => {
      if (!res?.ok) {
        setError(res?.error?.message || 'Could not join the voice call');
        stream.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        analysers.current.delete('self');
        setConnState('idle');
        setBusy(false);
        return;
      }

      inCallRef.current = true;
      setInCall(true);
      setConnState('connected');
      setParticipants(res.participants || []);

      for (const peer of res.participants || []) {
        if (peer.deviceId !== selfId && selfId < peer.deviceId) {
          await offerTo(peer.deviceId);
        }
      }

      startSpeakingLoop();
      setBusy(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, selfId]);

  const cleanup = useCallback(() => {
    for (const id of [...pcs.current.keys()]) closePeer(id);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    analysers.current.clear();
    speakingRef.current = new Set();
    setSpeakingSet(new Set());
    lastSelfSpeaking.current = false;
    if (audioHostRef?.current) audioHostRef.current.innerHTML = '';
    audioCtxRef.current?.close?.().catch?.(() => {});
    audioCtxRef.current = null;
    inCallRef.current = false;
    setInCall(false);
    setConnState('idle');
    setParticipants([]);
  }, [audioHostRef]);

  const leave = useCallback(() => {
    socket?.emit('mesh:leave', {});
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }, []);

  // Tear everything down on unmount.
  useEffect(() => cleanup, [cleanup]);

  return {
    inCall,
    participants,
    speakingSet,
    muted,
    connState,
    error,
    busy,
    join,
    leave,
    toggleMute,
    clearError: () => setError(''),
  };
}
