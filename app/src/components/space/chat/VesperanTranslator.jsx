import { useEffect, useState } from 'react';
import { Check, Languages, Loader2 } from 'lucide-react';
import { loadVesperan, translateToVesperan } from '@/lib/vesperan';

export default function VesperanTranslator({ draft, onUse }) {
  const [dict, setDict] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadVesperan()
      .then((map) => {
        if (alive) setDict(map);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const clean = draft.trim();
  const translated = dict && clean ? translateToVesperan(clean, dict) : '';
  const canUse = translated && translated.toLowerCase() !== clean.toLowerCase();

  return (
    <div className="mb-2 rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-glow backdrop-blur">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-indigo-200">
        <Languages className="h-3.5 w-3.5" />
        Vesperan
      </p>

      {!dict && !failed && (
        <p className="flex items-center gap-2 py-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />
          Opening the codex…
        </p>
      )}

      {failed && (
        <p className="py-1 text-xs text-rose-300">The codex could not be opened just now.</p>
      )}

      {dict && !clean && (
        <p className="py-1 text-xs text-slate-400">
          Write something above and it appears here in Vesperan.
        </p>
      )}

      {dict && clean && (
        <>
          <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-white/[0.04] px-3 py-2 text-sm leading-relaxed text-slate-100">
            {translated || clean}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-500">
              {canUse ? 'Words the codex knows are replaced' : 'No codex words in this yet'}
            </span>
            <button
              type="button"
              disabled={!canUse}
              onClick={() => onUse(translated)}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/90 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              Use in message
            </button>
          </div>
        </>
      )}
    </div>
  );
}