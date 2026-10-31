import { useEffect, useRef, useState } from 'react';
import { Moon, Pause, Play } from 'lucide-react';
import SleepSoundtrack from './sleep/SleepSoundtrack';
import GoodnightNotes from './sleep/GoodnightNotes';
import { playChime } from '@/lib/ambientAudio';
import { pauseSleepTrack, setSleepDeadline } from '@/lib/sleepPlayback';
import { formatDuration } from '@/lib/spaceData';

const PRESETS = [10, 20, 30, 45];
const RING_LENGTH = 540;

export default function SleepZone({ space, user, room }) {
  const { on, send, roomState } = room;
  const [minutes, setMinutes] = useState(20);
  const [timer, setTimer] = useState({ endsAt: 0, running: false });
  const [now, setNow] = useState(Date.now());
  const [startSignal, setStartSignal] = useState(0);
  const [finished, setFinished] = useState(0);
  const chimedRef = useRef(false);

  useEffect(() => on('timer', (message) => setTimer({ endsAt: message.endsAt, running: message.running })), [on]);

  useEffect(() => {
    if (roomState?.timer) setTimer(roomState.timer);
  }, [roomState]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const remaining = timer.running ? Math.max(0, Math.round((timer.endsAt - now) / 1000)) : 0;
  const chosenMinutes = Number(minutes) || 0;
  const target = chosenMinutes * 60;
  const shown = timer.running ? remaining : target;
  const progress = target ? Math.min(1, shown / target) : 0;

  useEffect(() => {
    if (timer.running && remaining === 0 && !chimedRef.current) {
      chimedRef.current = true;
      playChime();
    }
    if (remaining > 0) chimedRef.current = false;
  }, [remaining, timer.running]);

  // Hands the soundtrack the same finishing moment, so music and countdown end together.
  useEffect(() => {
    setSleepDeadline(timer.running ? timer.endsAt : null);
  }, [timer.running, timer.endsAt]);

  const done = timer.running && remaining === 0;

  useEffect(() => {
    if (done) setFinished((count) => count + 1);
  }, [done]);

  const start = () => {
    if (!chosenMinutes) return;
    const endsAt = Date.now() + chosenMinutes * 60000;
    setTimer({ endsAt, running: true });
    setStartSignal((count) => count + 1);
    send({ type: 'timer', action: 'start', endsAt });
  };

  const pause = () => {
    setTimer({ endsAt: 0, running: false });
    pauseSleepTrack();
    send({ type: 'timer', action: 'pause' });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
      <section className="glass-card flex flex-col items-center rounded-3xl p-6 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
          {done ? 'Goodnight, both of you' : 'Lights out in'}
        </p>

        <div className="relative my-5 grid h-48 w-48 place-items-center">
          <svg viewBox="0 0 200 200" className="absolute h-full w-full -rotate-90">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - progress)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="text-center">
            {done ? (
              <Moon className="mx-auto h-8 w-8 text-violet-200" />
            ) : (
              <>
                <p className="font-heading text-4xl font-semibold tracking-tight text-white">
                  {formatDuration(shown)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {timer.running ? 'until lights out' : 'ready when you are'}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setMinutes(preset)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                preset === minutes
                  ? 'border-violet-300/30 bg-violet-400/15 text-violet-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {preset} min
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
          <label htmlFor="exact-minutes">Exactly</label>
          <input
            id="exact-minutes"
            type="number"
            min="1"
            max="720"
            inputMode="numeric"
            value={minutes}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') {
                setMinutes('');
                return;
              }
              setMinutes(Math.min(720, Math.max(1, Math.round(Number(raw)))));
            }}
            onBlur={() => {
              if (!Number(minutes)) setMinutes(20);
            }}
            className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-sm text-slate-100 outline-none focus:border-violet-300/40"
          />
          <span>minutes</span>
        </div>

        <button
          onClick={timer.running ? pause : start}
          disabled={!timer.running && !chosenMinutes}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {timer.running ? 'Hold the countdown' : 'Start the countdown'}
        </button>

        <p className="mt-5 max-w-[16rem] text-center text-xs leading-relaxed text-muted-foreground">
          Your countdown is the same one they see. When it runs out, your phones go quiet together.
        </p>
      </section>

      <SleepSoundtrack
        space={space}
        user={user}
        startSignal={startSignal}
        stopSignal={finished}
      />

      <div className="lg:col-span-2">
        <GoodnightNotes space={space} user={user} />
      </div>
    </div>
  );
}