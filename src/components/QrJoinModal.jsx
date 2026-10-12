import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';

/** Pull an invite token (or a manual code) out of a scanned / pasted value. */
function parseInvite(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const pathMatch = raw.match(/\/join\/([A-Za-z0-9_-]{8,})/);
  if (pathMatch) return { kind: 'token', value: pathMatch[1] };
  try {
    const url = new URL(raw);
    const q = url.searchParams.get('invite') || url.searchParams.get('join');
    if (q) return { kind: 'token', value: q };
    const hash = url.hash.match(/join[=/]([A-Za-z0-9_-]{8,})/);
    if (hash) return { kind: 'token', value: hash[1] };
  } catch {
    // not a URL
  }
  // A short manual code (e.g. AB12CD34).
  if (/^[A-Za-z0-9]{6,12}$/.test(raw)) return { kind: 'code', value: raw.toUpperCase() };
  return { kind: 'token', value: raw };
}

const SCANNER_SUPPORTED =
  typeof window !== 'undefined' && 'BarcodeDetector' in window;

/**
 * QrJoinModal — join an expedition by scanning an invite QR code, pasting the
 * invite link, or typing the short code.
 *
 * Camera scanning uses the native BarcodeDetector API (Chrome / Android). Where
 * that isn't available, the paste field is the fallback — no extra dependency.
 */
export default function QrJoinModal({ onClose, onJoined }) {
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        /* already stopped */
      }
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const join = useCallback(
    async (value) => {
      const parsed = parseInvite(value);
      if (!parsed) {
        setError('Enter an invite link or code.');
        return;
      }
      setBusy(true);
      setError('');
      try {
        const res =
          parsed.kind === 'code'
            ? await api.post('/api/groups/join', { inviteCode: parsed.value })
            : await api.post(`/api/groups/invite/${encodeURIComponent(parsed.value)}/join`);
        stopCamera();
        onJoined?.(res.data.group, Boolean(res.data.alreadyMember));
        onClose?.();
      } catch (err) {
        setError(err.response?.data?.error || 'Could not join this expedition.');
      } finally {
        setBusy(false);
      }
    },
    [onClose, onJoined, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setCameraError('');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setScanning(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            join(codes[0].rawValue);
            return;
          }
        } catch {
          // detection can throw on a cold frame — keep scanning
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError('Camera unavailable. Paste the link or type the code instead.');
      stopCamera();
    }
  }, [join, stopCamera]);

  return (
    <div
      className="fixed inset-0 z-[2600] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-mono-800 bg-mono-900 shadow-lift animate-slide-up sm:rounded-3xl sm:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-mono-800 px-4 py-3">
          <h2 className="text-base font-bold text-white">Join an expedition</h2>
          <button type="button" onClick={() => { stopCamera(); onClose?.(); }} aria-label="Close" className="btn btn-ghost p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Camera / scan area */}
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-mono-700 bg-mono-950">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${scanning ? 'block' : 'hidden'}`}
              muted
              playsInline
            />
            {scanning && (
              <>
                <span className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-white/70" />
                <span className="pointer-events-none absolute left-0 right-0 top-0 h-0.5 animate-pulse bg-accent" />
              </>
            )}
            {!scanning && (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-mono-700 bg-mono-900 text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-7 w-7">
                    <rect x="4" y="4" width="6" height="6" rx="1.5" />
                    <rect x="14" y="4" width="6" height="6" rx="1.5" />
                    <rect x="4" y="14" width="6" height="6" rx="1.5" />
                    <path d="M14 14h2.5v2.5H14zM19.5 14v2.5M14 19.5h5.5" />
                  </svg>
                </span>
                <p className="text-sm font-semibold text-white">
                  {SCANNER_SUPPORTED ? 'Scan the expedition QR' : 'Paste your invite link'}
                </p>
                <p className="max-w-[16rem] text-[11px] leading-relaxed text-mono-400">
                  {SCANNER_SUPPORTED
                    ? 'Point your camera at the QR code an admin shared.'
                    : 'Your browser can’t scan in-app. Paste the invite link or type the short code below.'}
                </p>
                {SCANNER_SUPPORTED && (
                  <button type="button" onClick={startCamera} className="btn btn-primary btn-sm">
                    Open camera
                  </button>
                )}
              </div>
            )}
          </div>

          {scanning && (
            <button type="button" onClick={stopCamera} className="btn btn-secondary mt-3 w-full">
              Stop camera
            </button>
          )}

          {cameraError && (
            <p className="mt-3 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-xs text-mono-100">
              {cameraError}
            </p>
          )}

          {/* Manual fallback */}
          <div className="mt-4 border-t border-mono-800 pt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400">
              Invite link or code
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && join(manual)}
                placeholder="https://…/join/… or AB12CD34"
                className="input flex-1"
              />
              <button
                type="button"
                disabled={busy || !manual.trim()}
                onClick={() => join(manual)}
                className="btn btn-primary sm:w-auto"
              >
                {busy ? 'Joining…' : 'Join'}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
