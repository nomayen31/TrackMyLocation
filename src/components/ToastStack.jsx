import React from 'react';

/**
 * ToastStack — transient notifications for incoming DMs, vibrations and rings.
 * Rendered at the very top of the viewport so it is visible above every panel.
 */
export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[3000] flex flex-col items-center gap-2 px-3">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-mono-700 bg-mono-900/95 px-4 py-3 text-left shadow-lift backdrop-blur ${
            toast.alert ? 'alert-shake' : 'animate-pop-in'
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mono-800 text-base">
            {toast.icon || '🔔'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">
              {toast.title}
            </span>
            {toast.body && (
              <span className="block truncate text-xs text-mono-400">{toast.body}</span>
            )}
          </span>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-mono-500">
            Tap
          </span>
        </button>
      ))}
    </div>
  );
}
