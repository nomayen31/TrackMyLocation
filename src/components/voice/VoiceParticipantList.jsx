import React from 'react';
import VoiceParticipant from './VoiceParticipant';

/**
 * VoiceParticipantList — everyone currently in the room, with live speaking
 * indicators and mic status.
 */
export default function VoiceParticipantList({ participants = [], speakingSet, currentUserId }) {
  if (participants.length === 0) {
    return (
      <div className="empty-state py-8">
        <span className="empty-state-icon">🎙</span>
        <p className="text-sm font-semibold text-white">Nobody here yet</p>
        <p className="text-xs text-mono-400">You're the first one in this room.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {participants.map((p) => (
        <VoiceParticipant
          key={p.userId}
          participant={p}
          isSelf={p.userId === currentUserId}
          isSpeaking={Boolean(speakingSet?.has(p.userId))}
        />
      ))}
    </div>
  );
}
