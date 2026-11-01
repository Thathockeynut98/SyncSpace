import { useState } from 'react';
import { Check, Copy, Infinity as InfinityIcon } from 'lucide-react';
import SettingsSheet from './settings/SettingsSheet';
import PresenceGlow from './PresenceGlow';import { displayName } from '@/lib/spaceData';

function initials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function SpaceHeader({ space, user, room, onNameSaved }) {
  const [copied, setCopied] = useState(false);

  const partnerOnline = (room.peers || []).find((peer) => peer.seat !== room.seat);
  const waitingForPartner = (space.member_emails || []).length < 2;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(space.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      setCopied(false);
    }
  };

  const status = partnerOnline
    ? `${partnerOnline.name} is here with you`
    : waitingForPartner
      ? 'Share your code so they can join'
      : 'They are away right now';

  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-white/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-glow">
            <InfinityIcon className="h-5 w-5 text-white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-base font-semibold tracking-tight text-white">
              {space.name}
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  room.connected ? 'bg-emerald-400 animate-pulse-soft' : 'bg-amber-400'
                }`}
              />
              {room.connected ? status : 'Connecting…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={copyCode}
            className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              waitingForPartner
                ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/25'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
            title="Copy your join code"
          >
            <span className="font-mono tracking-[0.16em]">{space.invite_code}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Copy className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
            )}
          </button>

          <SettingsSheet space={space} user={user} onSaved={onNameSaved} />

          <div className="hidden -space-x-2 sm:flex">
            <div
              className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-semibold text-white ring-2 ring-background"
              title={displayName(user)}
            >
              {initials(displayName(user))}
              {room.connected && <PresenceGlow label="You are here" />}
            </div>
            {!waitingForPartner && (
              <div
                className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-[11px] font-semibold text-slate-100 ring-2 ring-background"
                title={space.member_names?.[1] || 'Them'}
              >
                {initials(space.member_names?.[1] || 'Them')}
                {partnerOnline && <PresenceGlow label="They are here with you" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}