import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const PARTICLES = [
  { word: 'ka', note: 'opens questions' },
  { word: 'ne', note: 'before the verb, negates' },
  { word: 'va', note: 'past' },
  { word: 'sha', note: 'future' },
  { word: 'es', note: 'is — never changes' },
];

const PRONOUNS = [
  { word: 'mi', note: 'I / me / my' },
  { word: 'tu', note: 'you' },
  { word: 'ni', note: 'we' },
  { word: 'ren', note: 'they' },
  { word: 'sa · se · ti', note: 'he · she · it' },
];

const QUESTIONS = [
  { word: 'ke', note: 'what' },
  { word: 'ki', note: 'who' },
  { word: 'ku', note: 'where' },
  { word: 'keri', note: 'why' },
  { word: 'koi', note: 'how' },
];

const EXAMPLES = [
  { ves: 'mi luma tu.', en: 'I love you.' },
  { ves: 'mi es vella.', en: 'I am fine.' },
  { ves: 'ti es vella.', en: "It's okay." },
  { ves: 'la zela vren tu.', en: 'The star sees you — good luck.' },
];

function WordList({ title, items }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.word} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-semibold text-amber-300">{item.word}</span>
            <span className="text-slate-400">{item.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CodexGrammar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-panel overflow-hidden rounded-3xl border border-white/8">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span className="font-heading text-sm font-semibold text-white">How Vesperan works</span>
          <span className="hidden text-xs text-slate-500 sm:inline">grammar essentials</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-6 border-t border-white/8 px-5 py-5">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">Word order</p>
              <p className="text-sm leading-relaxed text-slate-300">
                Subject, verb, object. Verbs never change for person or number.
              </p>
              <p className="mt-3 text-sm text-slate-400">
                This and that: <span className="font-semibold text-amber-300">tae</span> ·{' '}
                <span className="font-semibold text-amber-300">dae</span>
              </p>
            </div>
            <WordList title="Particles" items={PARTICLES} />
            <WordList title="Pronouns" items={PRONOUNS} />
            <WordList title="Questions" items={QUESTIONS} />
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">In a sentence</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {EXAMPLES.map((item) => (
                <li key={item.ves} className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
                  <p className="font-heading text-sm font-semibold text-amber-300">{item.ves}</p>
                  <p className="text-xs text-slate-400">{item.en}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}