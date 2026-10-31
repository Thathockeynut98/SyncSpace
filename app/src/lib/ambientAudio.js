// Ambient sound engine — everything is synthesised in the browser, no audio files.
// The engine outlives the Sleep Zone screen so sound keeps playing while you browse.

export const SOUND_PRESETS = [
  { id: 'rain', name: 'Rain on glass', kind: 'rain', icon: 'rain', level: 0.6 },
  { id: 'ocean', name: 'Slow waves', kind: 'ocean', icon: 'ocean', level: 0.5 },
  { id: 'brown', name: 'Deep brown noise', kind: 'brown', icon: 'noise', level: 0.4 },
  { id: 'fire', name: 'Fireplace', kind: 'fire', icon: 'fire', level: 0.5 },
  { id: 'wind', name: 'Night wind', kind: 'wind', icon: 'wind', level: 0.4 },
];

const MASTER = 0.42;

let context = null;
const voices = new Map();
const levels = new Map(SOUND_PRESETS.map((preset) => [preset.id, preset.level]));
const active = new Set();

function audioContext() {
  if (!context) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    context = new AudioCtx();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

function noise(kind, seconds) {
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

function buildVoice(kind) {
  const ctx = audioContext();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  const loop = (bufferKind, seconds) => {
    const source = ctx.createBufferSource();
    source.buffer = noise(bufferKind, seconds);
    source.loop = true;
    source.start();
    return source;
  };

  if (kind === 'rain') {
    const source = loop('white', 4);
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 900;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 6800;
    source.connect(high).connect(low).connect(gain);
  } else if (kind === 'ocean') {
    const source = loop('brown', 5);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 620;
    source.connect(low).connect(gain);
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.07;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.3;
    swell.connect(swellDepth).connect(gain.gain);
    swell.start();
  } else if (kind === 'brown') {
    const source = loop('brown', 5);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 900;
    source.connect(low).connect(gain);
  } else if (kind === 'wind') {
    const source = loop('white', 4);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.6;
    source.connect(band).connect(gain);
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.045;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 260;
    gust.connect(gustDepth).connect(band.frequency);
    gust.start();
  } else if (kind === 'fire') {
    const source = loop('brown', 5);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 520;
    source.connect(low).connect(gain);

    const crackleSource = loop('white', 2);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1900;
    band.Q.value = 0.9;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.02;
    crackleSource.connect(band).connect(crackleGain).connect(gain);

    const tick = () => {
      const now = ctx.currentTime;
      crackleGain.gain.cancelScheduledValues(now);
      crackleGain.gain.setValueAtTime(0.02 + Math.random() * 0.16, now);
      crackleGain.gain.exponentialRampToValueAtTime(0.02, now + 0.06 + Math.random() * 0.12);
    };
    const crackleTimer = window.setInterval(tick, 160);
    return { gain, cleanup: () => window.clearInterval(crackleTimer) };
  }

  return { gain, cleanup: () => {} };
}

export function getSoundState() {
  return SOUND_PRESETS.map((preset) => ({
    ...preset,
    level: levels.get(preset.id),
    on: active.has(preset.id),
  }));
}

function applyVoices() {
  const ctx = audioContext();
  SOUND_PRESETS.forEach((preset) => {
    const on = active.has(preset.id);
    if (!on && !voices.has(preset.id)) return;
    if (!voices.has(preset.id)) voices.set(preset.id, buildVoice(preset.kind));
    const voice = voices.get(preset.id);
    const target = on ? Math.max(0.0001, levels.get(preset.id) * MASTER) : 0;
    voice.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.4);
  });
}

export function toggleSound(id, on) {
  if (on) active.add(id);
  else active.delete(id);
  applyVoices();
}

export function setSoundLevel(id, level) {
  levels.set(id, level);
  applyVoices();
}

export function silenceAll() {
  active.clear();
  applyVoices();
}

export function playMessageChime() {
  const ctx = audioContext();
  [880, 1174.66].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    const start = ctx.currentTime + index * 0.11;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.5);
  });
}

export function playChime() {
  const ctx = audioContext();
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    const start = ctx.currentTime + index * 0.22;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 2.5);
  });
}