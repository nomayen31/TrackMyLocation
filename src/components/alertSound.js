/**
 * alertSound — device feedback for the "Vibrate" and "Ring" actions.
 *
 *   vibrate()      -> HTML5 Vibration API (no-op where unsupported)
 *   playRingtone() -> Web Audio ringtone, no audio asset required
 *   stopRingtone() -> cancels a playing ringtone
 *   installAudioUnlock() -> resumes the AudioContext on first user gesture,
 *                           which browsers require before any sound can play.
 *
 * All functions degrade gracefully: on desktop the vibration call is silently
 * dropped, and if Web Audio is unavailable we fall back to vibration only.
 */

let ctx = null;
let ringTimer = null;
let activeOscillators = [];

/** Lazily create (and reuse) a single AudioContext. */
function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) {
    try {
      ctx = new AudioCtx();
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

/** Resume a suspended context; safe to call often. */
export function unlockAudio() {
  const c = getContext();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {});
  }
}

/** Install a one-time gesture listener that unlocks audio. Returns a cleanup. */
export function installAudioUnlock() {
  if (typeof window === 'undefined') return () => {};
  const handler = () => unlockAudio();
  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });
  return () => {
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  };
}

/** Buzz the device (mobile only). */
export function vibrate(pattern = [200, 80, 200, 80, 400]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* unsupported */
  }
}

function scheduleBeep(context, { freq, start, duration, volume = 0.18 }) {
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);

  activeOscillators.push(osc);
}

/**
 * Play a repeating two-tone ringtone for `duration` ms.
 * Returns a `stop()` function so the caller can cancel early (e.g. after the
 * recipient taps "stop").
 */
export function playRingtone({ duration = 8000 } = {}) {
  const c = getContext();

  if (!c) {
    // No Web Audio — at least shake the phone.
    vibrate([500, 200, 500, 200, 500]);
    return () => {};
  }

  if (c.state === 'suspended') c.resume().catch(() => {});

  const startAt = c.currentTime + 0.02;
  const cycles = Math.max(1, Math.round(duration / 1200));

  for (let i = 0; i < cycles; i += 1) {
    const base = startAt + i * 1.2;
    scheduleBeep(c, { freq: 880, start: base, duration: 0.26 });
    scheduleBeep(c, { freq: 1174, start: base + 0.32, duration: 0.26 });
  }

  vibrate([400, 150, 400, 150, 400]);

  const stop = () => {
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    });
    activeOscillators = [];
    if (ringTimer) {
      clearTimeout(ringTimer);
      ringTimer = null;
    }
  };

  ringTimer = setTimeout(stop, duration + 200);
  return stop;
}

/** Stop any ringtone currently playing. */
export function stopRingtone() {
  if (ringTimer) {
    clearTimeout(ringTimer);
    ringTimer = null;
  }
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
  });
  activeOscillators = [];
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(0);
  } catch {
    /* unsupported */
  }
}
