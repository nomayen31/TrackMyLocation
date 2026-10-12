import React, { useMemo, useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

const MAX_BYTES = 5 * 1024 * 1024; // ~5 MB before base64

const PRIVACY_OPTIONS = [
  { id: 'group', label: 'Trip group', hint: 'Only members of this trip' },
  { id: 'global', label: 'Everyone', hint: 'All connected travellers' },
  { id: 'selected', label: 'Selected people', hint: 'Choose who can see it' },
];

const MEDIA_TABS = [
  { id: 'image', label: 'Photo' },
  { id: 'video', label: 'Video' },
  { id: 'text', label: 'Text' },
];

/**
 * StoryComposer — create a story with a media type, privacy tier, optional
 * audience and a view-once flag. Posts via REST (POST /api/stories), which
 * stores the audience transactionally and broadcasts to the right people.
 */
export default function StoryComposer({ socket, groupId, members = [], currentUser, onClose, onPosted }) {
  const [mediaType, setMediaType] = useState('image');
  const [preview, setPreview] = useState('');
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('group');
  const [audience, setAudience] = useState(() => new Set());
  const [viewOnce, setViewOnce] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const others = useMemo(
    () => members.filter((m) => m.id !== currentUser?.id),
    [members, currentUser?.id]
  );

  const pick = (event) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      setError('Please choose an image or video file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 5 MB. Try a smaller one.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
      setMediaType(isVideo ? 'video' : 'image');
    };
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const toggleAudience = (id) =>
    setAudience((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const post = async () => {
    setError('');
    if (mediaType === 'text' && !text.trim()) {
      setError('Write something for your text story.');
      return;
    }
    if (mediaType !== 'text' && !preview) {
      setError('Choose a photo or video first.');
      return;
    }
    if (privacy === 'selected' && audience.size === 0) {
      setError('Select at least one person.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/api/stories', {
        groupId: privacy === 'group' ? groupId : groupId || null,
        media: mediaType === 'text' ? null : preview,
        mediaType,
        text: mediaType === 'text' ? text.trim() : '',
        caption: caption.trim(),
        privacy,
        audienceIds: privacy === 'selected' ? [...audience] : [],
        viewOnce,
      });
      onPosted?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post your story.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-mono-800 bg-mono-900 shadow-lift animate-slide-up sm:max-w-lg sm:rounded-3xl sm:animate-pop-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-mono-800 px-4 py-3">
          <h2 className="text-base font-bold text-white">New story</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Media type */}
          <div className="flex gap-1 rounded-xl border border-mono-800 bg-mono-850 p-1">
            {MEDIA_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMediaType(tab.id)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mediaType === tab.id ? 'bg-white text-mono-950' : 'text-mono-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Media picker / text */}
          {mediaType === 'text' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              rows={5}
              placeholder="Write your story…"
              className="input mt-3 resize-none py-3 text-base"
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-mono-700 bg-mono-850"
              >
                {preview ? (
                  mediaType === 'video' ? (
                    <video src={preview} className="h-full w-full object-contain" muted playsInline controls />
                  ) : (
                    <img src={preview} alt="Story preview" className="h-full w-full object-contain" />
                  )
                ) : (
                  <span className="flex flex-col items-center gap-2 px-6 text-center text-mono-400">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-mono-700 bg-mono-900">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-6 w-6">
                        <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                        <circle cx="12" cy="13" r="3.2" />
                      </svg>
                    </span>
                    <span className="text-sm font-semibold text-mono-200">
                      Tap to choose {mediaType === 'video' ? 'a video' : 'a photo'}
                    </span>
                    <span className="text-[11px]">Up to 5 MB</span>
                  </span>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                capture="environment"
                onChange={pick}
                className="hidden"
              />
              <input
                type="text"
                value={caption}
                maxLength={200}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption… (optional)"
                className="input mt-3"
              />
            </>
          )}

          {/* Privacy */}
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-mono-400">
            Who can see this?
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {PRIVACY_OPTIONS.map((option) => {
              const active = privacy === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPrivacy(option.id)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    active ? 'border-white bg-mono-850' : 'border-mono-800 hover:border-mono-600'
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? 'border-accent' : 'border-mono-600'}`}>
                    {active && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{option.label}</span>
                    <span className="block text-[11px] text-mono-400">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Audience picker */}
          {privacy === 'selected' && (
            <div className="mt-3 rounded-2xl border border-mono-800 bg-mono-850 p-2">
              {others.length === 0 ? (
                <p className="px-2 py-2 text-xs text-mono-400">No other members to choose.</p>
              ) : (
                <ul className="flex max-h-52 flex-col overflow-y-auto">
                  {others.map((member) => {
                    const checked = audience.has(member.id);
                    return (
                      <li key={member.id}>
                        <button
                          type="button"
                          onClick={() => toggleAudience(member.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-mono-800"
                        >
                          <Avatar name={member.name} src={member.avatarUrl || member.image} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                            {member.name}
                          </span>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-accent bg-accent text-mono-950' : 'border-mono-600'}`}>
                            {checked && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" className="h-3 w-3">
                                <path d="m5 13 4.5 4.5L19 7" />
                              </svg>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* View once */}
          <button
            type="button"
            onClick={() => setViewOnce((v) => !v)}
            className="mt-4 flex w-full items-center gap-3 rounded-xl border border-mono-800 px-3 py-2.5 text-left hover:border-mono-600"
          >
            <span className={`flex h-10 w-6 shrink-0 items-center rounded-full p-0.5 transition ${viewOnce ? 'bg-accent' : 'bg-mono-700'}`}>
              <span className={`h-5 w-5 rounded-full bg-white transition ${viewOnce ? 'translate-x-4' : ''}`} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">View once</span>
              <span className="block text-[11px] text-mono-400">
                Each person can open it a single time, then it's gone.
              </span>
            </span>
          </button>

          {error && (
            <p className="mt-3 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-mono-800 px-4 py-3">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={post} disabled={busy} className="btn btn-primary flex-1">
            {busy ? 'Posting…' : 'Share story'}
          </button>
        </div>
      </div>
    </div>
  );
}
