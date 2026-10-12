import React, { useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

const MAX_BYTES = 2 * 1024 * 1024; // ~2 MB before base64

/**
 * ProfileEditor — update your name, photo, phone and social handle.
 * The photo is read as a data URL and stored on the user row, so it appears on
 * the map marker, member lists and chat as soon as it's saved.
 */
export default function ProfileEditor({ user, onClose, onSaved }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [social, setSocial] = useState(user?.social || '');
  const [image, setImage] = useState(null); // pending preview data URL
  const [preview, setPreview] = useState(user?.avatarUrl || user?.image || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const pick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That photo is larger than 2 MB. Try a smaller one.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError('');
      setImage(String(reader.result));
      setPreview(String(reader.result));
    };
    reader.onerror = () => setError('Could not read that image.');
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Your name cannot be empty.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = { name: name.trim(), phone: phone.trim(), social: social.trim() };
      if (image) payload.image = image;
      const res = await api.patch('/api/profile', payload);
      onSaved?.(res.data.user);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2700] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-mono-800 bg-mono-950/95 shadow-lift backdrop-blur-xl animate-slide-up sm:rounded-3xl sm:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-mono-800/80 px-4 py-3">
          <h2 className="text-base font-bold text-white">Edit profile</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="max-h-[80dvh] overflow-y-auto p-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative rounded-full"
              aria-label="Change profile photo"
            >
              <span className="story-ring-ui absolute -inset-1 rounded-full opacity-80" aria-hidden="true" />
              <span className="relative block rounded-full border-2 border-mono-950 bg-mono-900 p-1">
                {preview ? (
                  <img src={preview} alt="Preview" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <Avatar name={name || user?.name} size="xl" />
                )}
              </span>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-neon-tri text-white shadow-glowViolet">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
                  <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </span>
            </button>
            <p className="text-[11px] text-mono-400">Tap the photo to change it · up to 2 MB</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400">
              Display name
            </span>
            <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="input" />
          </label>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400">
              Phone number
            </span>
            <input
              type="tel"
              value={phone}
              maxLength={32}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 0100"
              className="input"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400">
              Social handle
            </span>
            <input
              type="text"
              value={social}
              maxLength={120}
              onChange={(e) => setSocial(e.target.value)}
              placeholder="@username or a profile link"
              className="input"
            />
          </label>

          <div className="mt-4 rounded-xl border border-mono-800/80 bg-mono-900/60 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-mono-400">
              Your photo shows on the live map and in the member list. Phone and social are visible to
              people sharing your trips.
            </p>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-sos/40 bg-sos/10 px-3 py-2 text-sm text-sos-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-mono-800/80 px-4 py-3">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={busy} className="btn btn-primary flex-1">
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
