import { ExternalLink, Gamepad2, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GAME_URL =
  'https://muse.ai/s/vesperan-party-game-tv61xvnmxw5nxn/7ky3FqEeGOxpvbOqqxmVQzEkCYL01DgxKPTyF2vmIko';

const MODES = ['Flash Clash', 'Moon Pass', 'Sentence Forge', 'Clue Circle', 'Draw & Guess'];

export default function VesperanPartyGame() {
  return (
    <div className="glass-panel relative overflow-hidden rounded-3xl border border-white/8 p-5 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-gradient-to-br from-indigo-500/25 to-violet-500/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-amber-300/80">
            <Gamepad2 className="h-3.5 w-3.5" /> 2–6 players · one screen
          </p>
          <h2 className="mt-1.5 font-heading text-2xl font-semibold text-white">Vesperan Party Game</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Pass the screen and chase the moon — quick clues, word battles, sentence scrambles and drawing
            rounds that teach the codex as you play.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {MODES.map((mode) => (
              <span
                key={mode}
                className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300"
              >
                {mode}
              </span>
            ))}
          </div>
        </div>

        <Button
          asChild
          className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90"
        >
          <a href={GAME_URL} target="_blank" rel="noreferrer">
            <Moon className="mr-2 h-4 w-4" /> Play the game
            <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-70" />
          </a>
        </Button>
      </div>
    </div>
  );
}