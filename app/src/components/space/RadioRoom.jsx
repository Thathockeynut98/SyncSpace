import { useEffect, useRef, useState } from 'react';
import { Headphones, Pause, Play } from 'lucide-react';
import {
  STATIONS,
  audioAwake,
  startStation,
  stopRadio,
  wakeAudio,
} from '@/lib/radioEngine';
import { cn } from '@/lib/utils';
import MediaVolumeSlider from './MediaVolumeSlider';
import TuneInStations from './radio/TuneInStations';

export default function RadioRoom({ room }) {
  const { on, send, seat, peers, roomState } = room;
  const [radio, setRadio] = useState({ station: null, playing: false });
  const [listening, setListening] = useState(false);
  const appliedRef = useRef('');

  useEffect(
    () => on('radio', (message) => setRadio({ station: message.station, playing: message.playing })),
    [on]
  );

  useEffect(() => {
    if (roomState?.radio) setRadio({ station: roomState.radio.station, playing: roomState.radio.playing });
  }, [roomState]);

  useEffect(() => {
    const key = `${radio.station || ''}|${radio.playing}`;
    if (appliedRef.current === key) return;
    appliedRef.current = key;
    if (radio.playing && radio.station) startStation(radio.station);
    else stopRadio();
    setListening(audioAwake() && radio.playing);
    const settle = window.setTimeout(() => setListening(audioAwake() && radio.playing), 500);
    return () => window.clearTimeout(settle);
  }, [radio]);

  const partner = peers.find((item) => item.seat !== seat) || null;
  const current = STATIONS.find((station) => station.id === radio.station) || null;
  const asleep = radio.playing && !listening;

  const tune = (stationId) => {
    wakeAudio();
    const next = radio.playing && radio.station === stationId
      ? { station: stationId, playing: false }
      : { station: stationId, playing: true };
    setRadio(next);
    send({ type: 'radio', station: stationId, playing: next.playing });
    setListening(next.playing);
  };

  const stop = () => {
    const next = { station: radio.station, playing: false };
    setRadio(next);
    send({ type: 'radio', station: radio.station, playing: false });
    setListening(false);
  };

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-white">Our radio</h2>
          <p className="text-xs text-muted-foreground">
            {current && radio.playing
              ? `${current.name} · ${partner ? 'you are both tuned in' : 'playing for you'}`
              : 'Stations made here, so nothing ever buffers'}
          </p>
        </div>
        <MediaVolumeSlider />
      </div>

      {asleep && (
        <button
          onClick={() => {
            wakeAudio();
            startStation(radio.station);
            setListening(true);
          }}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-left"
        >
          <span className="text-xs text-violet-100">They tuned in — tap to hear it on this device</span>
          <Play className="h-4 w-4 shrink-0 text-violet-200" />
        </button>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {STATIONS.map((station) => {
          const live = radio.playing && radio.station === station.id;
          return (
            <button
              key={station.id}
              onClick={() => tune(station.id)}
              className={cn(
                'group flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                live
                  ? 'border-violet-400/35 bg-violet-500/12'
                  : 'border-white/8 bg-white/[0.03] hover:border-violet-400/25 hover:bg-violet-500/[0.07]'
              )}
            >
              <span
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white',
                  station.tint
                )}
              >
                {live ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-100">{station.name}</span>
                  {live && (
                    <span className="flex h-3 items-end gap-[2px]">
                      {[0, 1, 2].map((bar) => (
                        <span
                          key={bar}
                          className="w-[2.5px] animate-waveform rounded-full bg-violet-300"
                          style={{ height: `${50 + bar * 18}%`, animationDelay: `${bar * 0.14}s` }}
                        />
                      ))}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{station.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/6 pt-3">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Headphones className="h-3.5 w-3.5" />
          {current && radio.playing ? `You are on ${current.name}` : 'Pick a station and they hear it too'}
        </p>
        {radio.playing && (
          <button
            onClick={stop}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-white/10"
          >
            Turn the radio off
          </button>
        )}
      </div>
      </section>
      <TuneInStations />
    </div>
  );
}