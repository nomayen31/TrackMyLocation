import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
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
  if (/^[A-Za-z0-9]{6,12}$/.test(raw)) return { kind: 'code', value: raw.toUpperCase() };
  return { kind: 'token', value: raw };
}

/**
 * QrJoinModal — join a trip by scanning its invite QR, pasting the link, or
 * typing the short code.
 *
 * Uses **jsQR** on a canvas frame, which works on every mobile browser
 * (including iOS Safari, where BarcodeDetector is unavailable). No extra native
 * permissions beyond the camera.
 */
export default function QrJoinModal({ onClose, onJoined }) {
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const busyRef = useRef(false);

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
      if (busyRef.current) return;
      const parsed = parseInvite(value);
      if (!parsed) {
        setError('Enter an invite link or code.');
        return;
      }
      busyRef.current = true;
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
        setError(err.response?.data?.error || 'Could not join this trip.');
        busyRef.current = false;
      } finally {
        setBusy(false);
      }
    },
    [onClose, onJoined, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setCameraError('');
    setError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser cannot open the camera. Paste the link instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });

      const tick = () => {
        if (!streamRef.current || !videoRef.current) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA && canvas && ctx) {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (w && h) {
            // Downscale for speed; QR decoding doesn't need full resolution.
            const scale = Math.min(1, 640 / Math.max(w, h));
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(image.data, image.width, image.height, {
                inversionAttempts: 'dontInvert',
              });
              if (code?.data) {
                join(code.data);
                return; // stop the loop; join() tears the camera down
              }
            } catch {
              /* a cold frame can throw — keep scanning */
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      setCameraError(
        denied
          ? 'Camera permission denied. Allow camera access, or paste the invite link below.'
          : 'Camera unavailable. Paste the invite link or type the code instead.'
      );
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
          <h2 className="text-base font-bold text-white">Join a trip</h2>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose?.();
            }}
            aria-label="Close"
            className="btn btn-ghost p-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Camera preview / empty state */}
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-mono-700 bg-mono-950">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${scanning ? 'block' : 'hidden'}`}
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {scanning && (
              <>
                <span className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-white/70" />
                <span className="pointer-events-none absolute left-0 right-0 top-0 h-0.5 animate-pulse bg-accent" />
                <span className="pointer-events-none absolute inset-x-10 bottom-4 rounded-full bg-black/60 px-3 py-1 text-center text-[11px] font-semibold text-white">
                  Point at the trip QR code
                </span>
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
                <p className="text-sm font-semibold text-white">Scan the trip QR code</p>
                <p className="max-w-[16rem] text-[11px] leading-relaxed text-mono-400">
                  Open your camera and point it at the code an admin shared.
                </p>
                <button type="button" onClick={startCamera} className="btn btn-primary btn-sm">
                  Open camera
                </button>
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
              Or paste the invite link / code
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
            <p className="mt-3 rounded-lg border border-sos/40 bg-sos/10 px-3 py-2 text-sm text-sos-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
