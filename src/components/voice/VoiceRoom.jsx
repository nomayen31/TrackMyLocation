import React from 'react';
import VoiceConnectionStatus from './VoiceConnectionStatus';
import VoiceParticipantList from './VoiceParticipantList';
import VoiceControls from './VoiceControls';

/**
 * VoiceRoom — the active room view: header, live participants with speaking
 * indicators, and mic/leave controls. Renders the hidden container that holds
 * the remote audio elements produced by LiveKit.
 */
export default function VoiceRoom({
  room,
  participants = [],
  speakingSet,
  connectionState,
  muted,
  currentUser,
  audioContainerRef,
  onToggleMute,
  onLeave,
  onOpenInvites,
  onRefresh,
  busy,
}) {
  return (
    <>
      {/* Hidden sink for remote audio tracks (LiveKit attaches <audio> here) */}
      <div ref={audioContainerRef} className="hidden" aria-hidden="true" />

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="hero-panel animate-fade-up">
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{room.isPrivate ? '🔒' : '🔊'}</span>
                <h2 className="truncate text-lg font-extrabold tracking-tight text-white">
                  {room.name}
                </h2>
              </div>
              <p className="mt-1 text-xs text-mono-300">
                {participants.length} connected
                {room.ownerName ? ` · owned by ${room.ownerName}` : ''}
                {room.isPrivate ? ' · private' : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <VoiceConnectionStatus state={connectionState} />
              <button type="button" onClick={onRefresh} className="btn btn-secondary btn-sm" title="Refresh participants">
                ⟳
              </button>
              <button type="button" onClick={onOpenInvites} className="btn btn-primary btn-sm">
                Invite
              </button>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="card card-pad animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="section-title">In the room</h3>
            <span className="chip chip-brand">{participants.length}</span>
          </div>
          <div className="mt-3">
            <VoiceParticipantList
              participants={participants}
              speakingSet={speakingSet}
              currentUserId={currentUser?.id}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="card card-pad animate-fade-up">
          <VoiceControls muted={muted} onToggleMute={onToggleMute} onLeave={onLeave} disabled={busy} />
          <p className="mt-3 text-center text-[11px] text-mono-400">
            {muted ? 'You are muted — tap the microphone to talk.' : 'Your microphone is live.'}
          </p>
        </div>
      </div>
    </>
  );
}
