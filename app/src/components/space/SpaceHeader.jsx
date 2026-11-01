import { useState } from 'react';
import { syncspaceApiBase } from '@/lib/syncspaceConnection';
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
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('unchecked');
  const [checkingApi, setCheckingApi] = useState(false);

  const checkConnection = async () => {
    setCheckingApi(true);
    setApiStatus('checking');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(`${syncspaceApiBase}/health`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        setApiStatus(response.ok ? 'online' : 'unavailable');
      } finally {
        clearTimeout(timer);
      }
    } catch {
      setApiStatus('unavailable');
    } finally {
      setCheckingApi(false);
    }
  };

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

          <div className="relative">
            <button
              type="button"
              onClick={() => setConnectionOpen((open) => !open)}
              aria-expanded={connectionOpen}
              aria-label="Connection status"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
            >
              <span className={`h-2 w-2 rounded-full ${room.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline">Connection</span>
              <span className="sm:hidden">Status</span>
            </button>
            {connectionOpen && (
              <div role="region" aria-label="Connection details" className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-violet-300/20 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur-xl">
                <h2 className="font-semibold text-violet-100">Connection Center</h2>
                <p className="mt-1 text-xs text-slate-400">Your shared universe, at a glance.</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3"><span>Live room</span><span className={room.connected ? 'text-emerald-300' : 'text-amber-300'}>{room.connected ? 'Connected' : 'Disconnected'}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Backend API</span><span className={apiStatus === 'online' ? 'text-emerald-300' : apiStatus === 'unavailable' ? 'text-rose-300' : 'text-slate-400'}>{apiStatus === 'online' ? 'Reachable' : apiStatus === 'unavailable' ? 'Unavailable' : apiStatus === 'checking' ? 'Checking…' : 'Not checked'}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Other person</span><span className={partnerOnline ? 'text-emerald-300' : 'text-slate-400'}>{partnerOnline ? 'Here' : 'Away'}</span></div>
                </div>
                <button type="button" onClick={checkConnection} disabled={checkingApi} className="mt-4 w-full rounded-xl border border-violet-400/30 bg-violet-500/20 px-3 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/30 disabled:opacity-50">
                  {checkingApi ? 'Checking connection…' : 'Check backend connection'}
                </button>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">Reachability is not a security or encryption audit. Calls also depend on device permissions and network connectivity.</p>
              </div>
            )}
          </div>

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