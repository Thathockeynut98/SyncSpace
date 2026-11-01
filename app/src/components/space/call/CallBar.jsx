import { HeadphoneOff, Headphones, Phone, PhoneOff } from 'lucide-react';

export default function CallBar({ call, visible, onAnswer, onTake, onOpen }) {
  if (!visible || !call) return null;

  const ringing = call.incoming;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6 md:justify-end md:px-6">
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/12 bg-slate-950/85 p-2.5 shadow-glow backdrop-blur-xl md:max-w-md">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <Phone className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {ringing
              ? `${call.partnerName} is calling`
              : call.elsewhere
                ? 'Your call is on another device'
                : `On a call with ${call.partnerName}`}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {ringing
              ? 'Answering asks for your microphone'
              : call.elsewhere
                ? 'Bring it here to talk on this one'
                : call.phase === 'live'
                  ? 'Connected'
                  : call.phase === 'waiting'
                    ? 'Waiting for your partner'
                    : 'Connecting…'}
          </p>
        </div>

        {ringing ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={call.dismiss}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-white/10"
            >
              Later
            </button>
            <button
              onClick={onAnswer}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1.5 text-[11px] font-semibold text-white"
            >
              Join
            </button>
          </div>
        ) : call.elsewhere ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={onOpen}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 transition-colors hover:bg-white/10"
            >
              Open
            </button>
            <button
              onClick={onTake}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3.5 py-1.5 text-[11px] font-semibold text-white"
            >
              Bring here
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={call.toggleDeafen}
              title={call.deafened ? 'Undeafen' : 'Deafen'}
              className={`grid h-8 w-8 place-items-center rounded-full border transition-colors ${
                call.deafened
                  ? 'border-rose-400/30 bg-rose-500/20 text-rose-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {call.deafened ? <HeadphoneOff className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onOpen}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 transition-colors hover:bg-white/10"
            >
              Open
            </button>
            <button
              onClick={call.hangUp}
              className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/90 text-white transition-colors hover:bg-rose-500"
              title="End the call"
            >
              <PhoneOff className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}