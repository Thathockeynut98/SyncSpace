import { useState } from 'react';
import { BellRing, Share, Smartphone, X } from 'lucide-react';
import useInstallPrompt from '@/lib/useInstallPrompt';
import { alertsPermission, alertsSupport, askForAlerts } from '@/lib/browserNotify';

// Turns the browser tab into a real app on the phone, and asks for the one
// permission that lets a ring or a note reach you when you are elsewhere.
export default function InstallCard() {
  const { available, apple, canPrompt, install, dismiss } = useInstallPrompt();
  const [permission, setPermission] = useState(() => alertsPermission());
  const [steps, setSteps] = useState(false);
  const [busy, setBusy] = useState(false);

  const alertsOff = alertsSupport() && permission !== 'granted';
  if (!available && !alertsOff) return null;

  const enableAlerts = async () => {
    setBusy(true);
    try {
      setPermission(await askForAlerts());
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card relative overflow-hidden rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />

      {available && (
        <div className="relative flex items-start gap-3">
          <img
            src="/icon-1024.jpg"
            alt=""
            className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 shadow-glow"
          />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold tracking-tight text-white">
              Put SyncSpace on your home screen
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Opens full screen, with no browser bars, like a real app.
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {canPrompt ? (
                <button
                  onClick={install}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Add to home screen
                </button>
              ) : apple ? (
                <button
                  onClick={() => setSteps((open) => !open)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
                >
                  <Share className="h-3.5 w-3.5" />
                  How to add it
                </button>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Open your browser menu, then choose “Add to Home screen”.
                </p>
              )}
            </div>

            {steps && apple && (
              <p className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
                Tap the Share button at the bottom of Safari, then scroll down and tap
                “Add to Home Screen”.
              </p>
            )}
          </div>

          <button
            onClick={dismiss}
            title="Not now"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {alertsOff && (
        <div
          className={`relative flex items-center gap-3 ${
            available ? 'mt-3.5 border-t border-white/8 pt-3.5' : ''
          }`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400/25 to-rose-500/15 text-amber-200">
            <BellRing className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white">Alerts when they ring or leave a note</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {permission === 'denied'
                ? 'Blocked — turn notifications back on in your browser settings.'
                : 'Turn on notifications so it reaches you anywhere.'}
            </p>
          </div>
          {permission !== 'denied' && (
            <button
              onClick={enableAlerts}
              disabled={busy}
              className="shrink-0 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              {busy ? 'Asking…' : 'Turn on'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}