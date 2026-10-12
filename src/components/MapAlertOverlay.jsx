import React from 'react';

/**
 * Severity presets — the three admin broadcast levels.
 *   notice  -> blue / white
 *   warning -> yellow / orange   (labelled "Alert")
 *   danger  -> red / black
 */
export const SEVERITIES = {
  notice: {
    id: 'notice',
    label: 'Notice',
    accent: '#3b82f6',
    cardClass: 'border-notice/60 bg-mono-900',
    tintClass: 'bg-notice/12',
    textClass: 'text-notice-300',
    badgeClass: 'bg-notice/15 text-notice-300 ring-1 ring-inset ring-notice/30',
    buttonClass: 'bg-notice text-white hover:bg-notice-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
    ),
  },
  warning: {
    id: 'warning',
    label: 'Alert',
    accent: '#f59e0b',
    cardClass: 'border-warning/70 bg-mono-900',
    tintClass: 'bg-warning/12',
    textClass: 'text-warning-300',
    badgeClass: 'bg-warning/15 text-warning-300 ring-1 ring-inset ring-warning/30',
    buttonClass: 'bg-warning text-mono-950 hover:bg-warning-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-5 w-5">
        <path d="M12 3 2 20h20z" />
        <path d="M12 9.5v4M12 17h.01" />
      </svg>
    ),
  },
  danger: {
    id: 'danger',
    label: 'Danger',
    accent: '#ef4444',
    cardClass: 'border-sos/70 bg-black',
    tintClass: 'bg-sos/15',
    textClass: 'text-sos-400',
    badgeClass: 'bg-sos/20 text-sos-400 ring-1 ring-inset ring-sos/40',
    buttonClass: 'bg-sos text-white hover:bg-sos-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
        <path d="M12 3 2 20h20z" />
        <path d="M12 9v5M12 17h.01" />
      </svg>
    ),
  },
};

function timeAgo(ts) {
  if (!ts) return '';
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
}

/**
 * MapAlertOverlay — a prominent modal-like card rendered directly over the
 * Leaflet canvas when an admin broadcasts. Includes an explicit Dismiss button.
 *
 * `queue` is an array of broadcasts; the newest is shown, and dismissing reveals
 * the next one.
 */
export default function MapAlertOverlay({ queue = [], onDismiss }) {
  if (!queue || queue.length === 0) return null;

  const alert = queue[queue.length - 1];
  const severity = SEVERITIES[alert.type] || SEVERITIES.notice;
  const remaining = queue.length - 1;

  return (
    <div className="absolute inset-0 z-[2400] flex items-center justify-center p-3 sm:p-6">
      {/* Dimmed map behind the card */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden="true" />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`${severity.label}: ${alert.title || 'Admin broadcast'}`}
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border-2 shadow-lift animate-pop-in ${severity.cardClass}`}
      >
        {/* Severity accent bar */}
        <span className="block h-1.5 w-full" style={{ backgroundColor: severity.accent }} />

        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${severity.tintClass} ${severity.textClass}`}
            >
              {severity.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${severity.badgeClass}`}>{severity.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-mono-500">
                  {alert.senderName} · {timeAgo(alert.at)}
                </span>
              </div>
              {alert.title && (
                <h3 className="mt-2 text-lg font-extrabold leading-tight tracking-tight text-white">
                  {alert.title}
                </h3>
              )}
            </div>
          </div>

          {alert.message && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mono-200">
              {alert.message}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDismiss?.(alert.id)}
              className={`btn flex-1 py-2.5 ${severity.buttonClass}`}
            >
              Dismiss
            </button>
            {remaining > 0 && (
              <span className="chip chip-slate shrink-0">+{remaining} more</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
