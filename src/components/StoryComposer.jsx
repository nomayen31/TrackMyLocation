import React, { useRef, useState } from 'react';

const MAX_BYTES = 5 * 1024 * 1024; // ~5 MB before base64 encoding

/**
 * StoryComposer — captures/picks a photo and posts it as a trip story.
 * The image is read as a data URL in the browser and emitted over Socket.IO
 * (`post-story`), which stores it in PostgreSQL and broadcasts `story-updated`.
 */
export default function StoryComposer({ socket, groupId, onClose, onPosted }) {
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const pick = (event) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is larger than 5 MB. Try a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.onerror = () => setError('Could not read that image.');
    reader.readAsDataURL(file);
  };

  const post = () => {
    if (!preview) {
      setError('Choose a photo first.');
      return;
    }
    if (!socket) {
      setError('Not connected. Try again in a moment.');
      return;
    }

    setBusy(true);
    setError('');

    socket.emit('post-story', { groupId, media: preview, caption }, (response) => {
      setBusy(false);
      if (response?.error) {
        setError(response.error);
        return;
      }
      onPosted?.(response?.story);
      onClose?.();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div className="sheet p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-mono-700 sm:hidden" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Add to your story</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className="mt-1 text-xs text-mono-400">
          Shared with everyone on this trip. Disappears after 24 hours.
        </p>

        {/* Photo picker / preview */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-mono-700 bg-mono-850"
        >
          {preview ? (
            <img src={preview} alt="Story preview" className="h-full w-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-2 px-6 text-center text-mono-400">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-mono-700 bg-mono-900">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-6 w-6">
                  <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-mono-200">Tap to choose a photo</span>
              <span className="text-[11px]">JPG or PNG · up to 5 MB</span>
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={pick}
          className="hidden"
        />

        <input
          type="text"
          value={caption}
          maxLength={200}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Add a caption… (optional)"
          className="input mt-3"
        />

        {error && (
          <p className="mt-2 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={post}
            disabled={busy || !preview}
            className="btn btn-primary flex-1"
          >
            {busy ? 'Posting…' : 'Post story'}
          </button>
        </div>
      </div>
    </div>
  );
}
