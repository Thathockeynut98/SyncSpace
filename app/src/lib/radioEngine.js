// The radio: stations built from noise beds, slow chord pads and a soft heartbeat.
// Everything is synthesised here, so it starts instantly and never buffers. The
// engine lives outside React so the music keeps playing while you move around.
import { getMediaVolume, subscribeMediaVolume } from '@/lib/mediaVolume';

export const STATIONS = [
  {
    id: 'midnight-rain',
    name: 'Midnight Rain',
    blurb: 'Rain on the glass, a warm chord underneath',
    tint: 'from-sky-400/80 to-indigo-500/80',
    bed: { kind: 'rain', level: 0.5 },
    pad: { notes: [146.83, 174.61, 220.0, 261.63], type: 'sine', level: 0.07 },
    pulse: null,
  },
  {
    id: 'lofi-drift',
    name: 'Lo-Fi Drift',
    blurb: 'Dusty chords and a slow, sleepy beat',
    tint: 'from-amber-300/80 to-rose-400/80',
    bed: { kind: 'brown', level: 0.22 },
    pad: { notes: [110.0, 164.81, 220.0, 277.18], type: 'triangle', level: 0.06 },
    pulse: { bpm: 68, level: 0.1 },
  },
  {
    id: 'fireside',
    name: 'Fireside',
    blurb: 'Crackle, low warmth, nothing urgent',
    tint: 'from-orange-400/80 to-rose-500/80',
    bed: { kind: 'fire', level: 0.55 },
    pad: { notes: [130.81, 196.0, 261.63], type: 'sine', level: 0.05 },
    pulse: null,
  },
  {
    id: 'deep-blue',
    name: 'Deep Blue',
    blurb: 'Slow waves and a wide open pad',
    tint: 'from-cyan-400/80 to-blue-600/80',
    bed: { kind: 'ocean', level: 0.5 },
    pad: { notes: [98.0, 146.83, 196.0, 246.94], type: 'sine', level: 0.07 },
    pulse: null,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    blurb: 'A drone that breathes, like the sky on the wall',
    tint: 'from-violet-400/80 to-fuchsia-500/80',
    bed: { kind: 'wind', level: 0.28 },
    pad: { notes: [123.47, 185.0, 246.94, 311.13], type: 'sine', level: 0.05 },
    pulse: null,
  },
];

let context = null;
let master = null;
let live = null;

// The radio follows the one media volume, so a station is never louder or
// quieter than the songs and the sleep soundtrack.
subscribeMediaVolume((level) => {
  if (!master || !context) return;
  master.gain.setTargetAtTime(level, context.currentTime, 0.2);
});

function audioContext() {
  if (!context) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    context = new AudioCtx();
    master = context.createGain();
    master.gain.value = getMediaVolume();
    master.connect(context.destination);
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

function noiseBuffer(kind, seconds) {
  const ctx = audioContext();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (kind === 'brown') {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

function buildBed(station, output) {
  const ctx = audioContext();
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(station.bed.kind === 'brown' ? 'brown' : 'white', 5);
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = station.bed.level;
  let tail = source;

  if (station.bed.kind === 'rain') {
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 1100;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 7200;
    tail = tail.connect(high).connect(low);
  } else if (station.bed.kind === 'ocean') {
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 640;
    tail = tail.connect(low);
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.06;
    const depth = ctx.createGain();
    depth.gain.value = 0.28;
    swell.connect(depth).connect(gain.gain);
    swell.start();
  } else if (station.bed.kind === 'fire') {
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 560;
    tail = tail.connect(low);
    const crackle = ctx.createGain();
    crackle.gain.value = 0.02;
    tail = tail.connect(crackle);
    const timer = window.setInterval(() => {
      const now = ctx.currentTime;
      crackle.gain.cancelScheduledValues(now);
      crackle.gain.setValueAtTime(0.02 + Math.random() * 0.18, now);
      crackle.gain.exponentialRampToValueAtTime(0.02, now + 0.06 + Math.random() * 0.14);
    }, 180);
    live.timers.push(timer);
  } else if (station.bed.kind === 'wind') {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 470;
    band.Q.value = 0.7;
    tail = tail.connect(band);
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.05;
    const depth = ctx.createGain();
    depth.gain.value = 240;
    gust.connect(depth).connect(band.frequency);
    gust.start();
  } else {
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1200;
    tail = tail.connect(low);
  }

  tail.connect(gain).connect(output);
  source.start();
  live.sources.push(source);
}

function buildPad(station, output) {
  const ctx = audioContext();
  const padGain = ctx.createGain();
  padGain.gain.value = station.pad.level;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  padGain.connect(filter).connect(output);

  station.pad.notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = station.pad.type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index % 2 === 0 ? -4 : 5;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.35;
    oscillator.connect(voiceGain).connect(padGain);
    oscillator.start();
    live.sources.push(oscillator);
  });

  const breath = ctx.createOscillator();
  breath.frequency.value = 0.055;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = station.pad.level * 0.55;
  breath.connect(breathDepth).connect(padGain.gain);
  breath.start();
  live.sources.push(breath);
}

function buildPulse(station, output) {
  const ctx = audioContext();
  const beat = 60 / station.pulse.bpm;
  const thump = () => {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(88, now);
    oscillator.frequency.exponentialRampToValueAtTime(52, now + 0.18);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(station.pulse.level, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    oscillator.connect(gain).connect(output);
    oscillator.start(now);
    oscillator.stop(now + 0.34);
  };
  thump();
  const timer = window.setInterval(thump, beat * 1000);
  live.timers.push(timer);
}

export function startStation(id) {
  const station = STATIONS.find((item) => item.id === id);
  if (!station) return;
  stopRadio();
  const ctx = audioContext();
  const output = ctx.createGain();
  output.gain.value = 0;
  output.connect(master);
  output.gain.setTargetAtTime(1, ctx.currentTime, 0.5);

  live = { id, station: station.id, sources: [], timers: [], output };
  if (station.bed) buildBed(station, output);
  if (station.pad) buildPad(station, output);
  if (station.pulse) buildPulse(station, output);
}

export function stopRadio() {
  if (!live) return;
  const ctx = audioContext();
  const dying = live;
  live = null;
  dying.timers.forEach((timer) => window.clearInterval(timer));
  dying.output.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  window.setTimeout(() => {
    dying.sources.forEach((source) => {
      try {
        source.stop();
      } catch (error) {
        /* already stopped */
      }
      source.disconnect();
    });
    dying.output.disconnect();
  }, 700);
}

export function getRadioState() {
  return { station: live ? live.station : null, playing: Boolean(live) };
}

// Browsers keep the audio asleep until someone touches the page.
export function audioAwake() {
  return Boolean(context) && context.state === 'running';
}

export function wakeAudio() {
  audioContext();
}