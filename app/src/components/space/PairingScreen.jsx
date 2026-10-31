import { useState } from 'react';
import { Infinity as InfinityIcon, Loader2, LogIn, Sparkles } from 'lucide-react';
import { createSpace, joinSpace } from '@/lib/spaceData';

export default function PairingScreen({ user, onReady }) {
  const [mode, setMode] = useState('choose');
  const [name, setName] = useState('Our Little Space');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const space = await createSpace({ name, user });
      onReady(space);
    } catch (err) {
      setError(err?.message || 'That did not work. Give it another try.');
      setBusy(false);
    }
  };

  const join = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const space = await joinSpace({ code, user });
      onReady(space);
    } catch (err) {
      setError(err?.message || 'That code did not match a space.');
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-indigo-600/25 blur-[130px] animate-drift-slow" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-[140px] animate-drift" />
      </div>

      <div className="glass-card relative w-full max-w-md rounded-3xl p-7 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-glow">
            <InfinityIcon className="h-5 w-5 text-white" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-tight text-white">
              Two people, one space
            </h1>
            <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
          </div>
        </div>

        {mode === 'choose' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-slate-300">
              One of you opens the space and sends the code. The other types it in. After that
              everything inside is yours alone.
            </p>
            <button
              onClick={() => setMode('create')}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10"
            >
              <Sparkles className="h-5 w-5 text-indigo-300" />
              <span>
                <span className="block text-sm font-semibold text-white">Start our space</span>
                <span className="block text-xs text-muted-foreground">
                  You get a join code to send them
                </span>
              </span>
            </button>
            <button
              onClick={() => setMode('join')}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10"
            >
              <LogIn className="h-5 w-5 text-fuchsia-300" />
              <span>
                <span className="block text-sm font-semibold text-white">I have a code</span>
                <span className="block text-xs text-muted-foreground">
                  Type the code they sent you
                </span>
              </span>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={start} className="flex flex-col gap-3">
            <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              What should we call it
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Our Little Space"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400/60"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? 'Opening it…' : 'Open our space'}
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={join} className="flex flex-col gap-3">
            <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              The join code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-mono text-lg tracking-[0.28em] text-white outline-none transition-colors placeholder:text-slate-600 focus:border-fuchsia-400/60"
            />
            <button
              type="submit"
              disabled={busy || code.trim().length < 4}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? 'Finding it…' : 'Join them'}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        {mode !== 'choose' && (
          <button
            onClick={() => {
              setMode('choose');
              setError('');
            }}
            className="mt-4 text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}