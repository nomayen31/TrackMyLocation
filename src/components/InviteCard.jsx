import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import api from '../api';

/**
 * InviteCard — the group's invite code, a shareable link and a QR code.
 * The QR encodes the invite link (`/join/<token>`); scanning it opens the app
 * and auto-joins the trip.
 */
export default function InviteCard({ groupId, compact = false }) {
  const [invite, setInvite] = useState(null);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(`/api/groups/${groupId}/invite`)
      .then((res) => active && setInvite(res.data))
      .catch(() => active && setError('Could not load the invite link.'));
    return () => {
      active = false;
    };
  }, [groupId]);

  useEffect(() => {
    if (!invite?.inviteLink) return;
    let active = true;
    QRCode.toDataURL(invite.inviteLink, {
      width: 320,
      margin: 1,
      color: { dark: '#030712', light: '#ffffff' },
    })
      .then((url) => active && setQr(url))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [invite?.inviteLink]);

  const copy = useCallback(async (value, which) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      // clipboard unavailable
    }
  }, []);

  const share = async () => {
    if (!invite?.inviteLink) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join my trip', text: 'Join my trip on Trip Tracker', url: invite.inviteLink });
        return;
      } catch {
        // user cancelled
      }
    }
    copy(invite.inviteLink, 'link');
  };

  if (error) return <p className="text-xs text-mono-400">{error}</p>;
  if (!invite) return <div className="skeleton h-20 w-full rounded-2xl" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-xl border border-mono-700 bg-mono-850 px-3 py-2 font-mono text-base font-bold tracking-[0.18em] text-white">
          {invite.inviteCode}
        </span>
        <button type="button" onClick={() => copy(invite.inviteCode, 'code')} className="btn btn-secondary btn-sm">
          {copied === 'code' ? 'Copied ✓' : 'Copy code'}
        </button>
        <button type="button" onClick={() => setShowQr((v) => !v)} className="btn btn-secondary btn-sm">
          {showQr ? 'Hide QR' : 'Show QR'}
        </button>
        <button type="button" onClick={share} className="btn btn-primary btn-sm">
          Share link
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-mono-800 bg-mono-850 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs text-mono-300">{invite.inviteLink}</span>
        <button type="button" onClick={() => copy(invite.inviteLink, 'link')} className="btn btn-ghost btn-sm shrink-0">
          {copied === 'link' ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      {showQr && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-mono-800 bg-mono-850 p-4 animate-pop-in">
          {qr ? (
            <a href={qr} download="trip-invite-qr.png" className="rounded-xl bg-white p-2" title="Download QR">
              <img src={qr} alt="Invite QR code" className="h-48 w-48" />
            </a>
          ) : (
            <div className="skeleton h-48 w-48" />
          )}
          <p className="max-w-[16rem] text-center text-[11px] leading-relaxed text-mono-400">
            Scan with a phone camera to open the app and join this trip automatically.
          </p>
        </div>
      )}

      {!compact && (
        <p className="text-[11px] text-mono-500">
          Anyone with the link or code joins as a <span className="font-semibold text-mono-300">member</span>.
        </p>
      )}
    </div>
  );
}
