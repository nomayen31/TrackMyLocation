import React from 'react';
import Avatar from './Avatar';

/**
 * MemberActionSheet — the rich action menu opened from a map marker.
 * Bottom sheet on phones, centred card on larger screens.
 */
export default function MemberActionSheet({
  member,
  distanceText,
  hasStory,
  isMe = false,
  onClose,
  onViewStory,
  onMessage,
  onCall,
  onVibrate,
  onRing,
}) {
  if (!member) return null;

  const actions = [
    {
      key: 'story',
      label: 'Story',
      hint: hasStory ? 'View their latest story' : 'No active story',
      icon: '◎',
      disabled: !hasStory,
      onClick: onViewStory,
    },
    {
      key: 'dm',
      label: 'Message',
      hint: 'Send a private message',
      icon: '✉',
      disabled: isMe,
      onClick: onMessage,
    },
    {
      key: 'call',
      label: 'Call',
      hint: 'Start a voice call',
      icon: '☏',
      disabled: isMe,
      accent: true,
      onClick: onCall,
    },
    {
      key: 'vibrate',
      label: 'Vibrate',
      hint: 'Buzz their phone',
      icon: '≈',
      disabled: isMe,
      accent: true,
      onClick: onVibrate,
    },
    {
      key: 'ring',
      label: 'Ring',
      hint: 'Play an alert on their device',
      icon: '♫',
      disabled: isMe,
      accent: true,
      onClick: onRing,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div className="sheet p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-mono-700 sm:hidden" />

        <div className="flex items-start gap-3">
          <Avatar
            name={member.name}
            src={member.avatarUrl}
            size="lg"
            hasStory={hasStory}
            onClick={hasStory ? onViewStory : undefined}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-white">{member.name}</p>
            <p className="mt-0.5 text-xs font-medium text-mono-400">
              {isMe
                ? 'This is you'
                : distanceText
                  ? `${distanceText} away`
                  : 'Distance unavailable'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-ghost -mr-1 -mt-1 p-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                action.accent
                  ? 'border-accent/40 bg-accent/10 hover:bg-accent/20'
                  : 'border-mono-800 bg-mono-850 hover:border-mono-600'
              }`}
            >
              <span className={`text-lg ${action.accent ? 'text-accent-300' : 'text-white'}`}>
                {action.icon}
              </span>
              <span className="text-sm font-bold text-white">{action.label}</span>
              <span className="text-[10px] leading-tight text-mono-400">{action.hint}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] text-mono-500">
          Vibration works on mobile browsers · Ring uses device audio
        </p>
      </div>
    </div>
  );
}
