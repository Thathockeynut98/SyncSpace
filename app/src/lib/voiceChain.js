// The microphone chain, in one place. A call and the "hear your own mic" test
// both run the exact same shape, level and dynamics, so what you hear while
// testing is what your partner hears on the line.

// Compression trims peaks, so a little make-up gain puts the voice back on top.
export const MAKEUP = 1.25;
export const DEFAULT_GATE = -48;

// How the voice engine leans, in one tap. The sliders under them stay live, so a
// profile is a starting point rather than a lock.
export const VOICE_PRESETS = {
  natural: { label: 'Natural', bass: 2, clarity: 2.5, air: -2 },
  warm: { label: 'Warm', bass: 6, clarity: 1, air: -3.5 },
  clear: { label: 'Clear', bass: 0, clarity: 5, air: 0 },
  studio: { label: 'Studio', bass: 3, clarity: 4, air: 1.5 },
};

export const DEFAULT_TONE = VOICE_PRESETS.natural;

// A warm, natural voice shape: a little body down low, gentle presence where
// consonants live, and the sharpest air rolled back so nothing hisses or whistles.
export function shapeVoice(ctx, { warmth = 2, presence = 2.5, air = -2 } = {}) {
  const body = ctx.createBiquadFilter();
  body.type = 'lowshelf';
  body.frequency.value = 170;
  body.gain.value = warmth;

  const clarity = ctx.createBiquadFilter();
  clarity.type = 'peaking';
  clarity.frequency.value = 2700;
  clarity.Q.value = 0.9;
  clarity.gain.value = presence;

  const soften = ctx.createBiquadFilter();
  soften.type = 'highshelf';
  soften.frequency.value = 7000;
  soften.gain.value = air;

  return [body, clarity, soften];
}

// One soft compressor for both sides: slow enough to keep syllables breathing.
export function shapeCompressor(ctx, { threshold = -20, ratio = 2, release = 0.25 } = {}) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = threshold;
  comp.knee.value = 30;
  comp.ratio.value = ratio;
  comp.attack.value = 0.006;
  comp.release.value = release;
  return comp;
}

// A brick wall at the very end of the chain: however far the loudness slider is
// pushed, nothing ever leaves the mic clipped or crackling.
export function shapeLimiter(ctx) {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.09;
  return limiter;
}

// Voice isolation keeps only the range a speaking voice lives in: the bottom and
// top of the room are cut away, so fans, traffic and hiss never reach the line.
export function applyIsolation(mic, on) {
  if (!mic?.isoLow || !mic?.isoHigh) return;
  mic.isoLow.frequency.value = on ? 135 : 20;
  mic.isoHigh.frequency.value = on ? 7600 : 20000;
}

// Input sensitivity is how hard the mic is driven before anything else touches it:
// down for a hot mic that distorts, up for a quiet one that barely registers.
export function sensitivityGain(value) {
  const db = ((Number(value) || 100) - 100) * 0.15;
  return Math.pow(10, db / 20);
}

// Auto level holds your voice at one steady distance: a whisper across the room
// and a voice right at the mic both arrive at the same level.
const AUTO_TARGET_DB = -24;
const AUTO_EASE = 0.6;

// Builds the whole graph and returns every node that settings can reach.
export function buildVoiceChain(ctx, raw, voice = {}) {
  const source = ctx.createMediaStreamSource(raw);
  const clean = ctx.createBiquadFilter();
  const [body, clarity, soften] = shapeVoice(ctx, {
    warmth: voice.bass ?? DEFAULT_TONE.bass,
    presence: voice.clarity ?? DEFAULT_TONE.clarity,
    air: voice.air ?? DEFAULT_TONE.air,
  });
  // The low-mid that turns a voice to mush when a room is close: taken down a
  // little, so the bass above it reads as body instead of boom.
  const mud = ctx.createBiquadFilter();
  mud.type = 'peaking';
  mud.frequency.value = 320;
  mud.Q.value = 0.9;
  mud.gain.value = -1.5;

  const comp = shapeCompressor(ctx, { threshold: -18, ratio: 1.8, release: 0.3 });
  const isoLow = ctx.createBiquadFilter();
  isoLow.type = 'highpass';
  isoLow.Q.value = 0.7;
  const isoHigh = ctx.createBiquadFilter();
  isoHigh.type = 'lowpass';
  isoHigh.Q.value = 0.7;
  const input = ctx.createGain();
  const auto = ctx.createGain();
  const suppress = ctx.createGain();
  const gain = ctx.createGain();
  const gate = ctx.createGain();
  const limiter = shapeLimiter(ctx);
  const analyser = ctx.createAnalyser();
  const dest = ctx.createMediaStreamDestination();
  analyser.fftSize = 512;

  // Rumble and room hum out, body and warmth back in, a gentle lift where words
  // become clear, then a light compressor so nothing ever clips.
  clean.type = 'highpass';
  clean.frequency.value = 95;
  clean.Q.value = 0.6;

  input.gain.value = sensitivityGain(voice.sensitivity);
  auto.gain.value = 1;
  suppress.gain.value = 1;
  gain.gain.value = (voice.loudness ?? 1.2) * MAKEUP;

  source.connect(input);
  input.connect(analyser);
  input.connect(auto);
  auto.connect(clean);
  clean.connect(body);
  body.connect(mud);
  mud.connect(clarity);
  clarity.connect(soften);
  soften.connect(isoLow);
  isoLow.connect(isoHigh);
  isoHigh.connect(comp);
  comp.connect(suppress);
  suppress.connect(gain);
  gain.connect(gate);
  gate.connect(limiter);
  limiter.connect(dest);

  const mic = {
    ctx,
    source,
    input,
    auto,
    body,
    mud,
    clarity,
    soften,
    suppress,
    gain,
    gate,
    limiter,
    isoLow,
    isoHigh,
    analyser,
    dest,
    agc: null,
    samples: new Uint8Array(analyser.fftSize),
  };
  applyIsolation(mic, voice.isolation !== false);
  return mic;
}

// Pushes the sensitivity, loudness, tone and isolation settings onto a live graph.
export function applyMicSettings(mic, voice) {
  if (!mic) return;
  const now = mic.ctx.currentTime;
  mic.input.gain.setTargetAtTime(sensitivityGain(voice.sensitivity), now, 0.02);
  mic.gain.gain.value = (voice.loudness ?? 1.2) * MAKEUP;
  if (mic.body) mic.body.gain.value = voice.bass ?? DEFAULT_TONE.bass;
  if (mic.clarity) mic.clarity.gain.value = voice.clarity ?? DEFAULT_TONE.clarity;
  if (mic.soften) mic.soften.gain.value = voice.air ?? DEFAULT_TONE.air;
  if (mic.auto && voice.autoLevel === false) mic.auto.gain.setTargetAtTime(1, now, 0.1);
  applyIsolation(mic, voice.isolation !== false);
}

// Reads the mic and drives auto level, the suppression and the gate. `last` is a
// ref that remembers the last moment a word crossed the line, so the gate holds
// open a beat instead of clipping the ends of words. Returns the current loudness.
export function driveMic(mic, voice, last) {
  mic.analyser.getByteTimeDomainData(mic.samples);
  let sum = 0;
  for (let index = 0; index < mic.samples.length; index += 1) {
    const value = (mic.samples[index] - 128) / 128;
    sum += value * value;
  }
  const rms = Math.sqrt(sum / mic.samples.length);
  const db = 20 * Math.log10(Math.max(rms, 1e-6));
  const now = mic.ctx.currentTime;

  // Auto level: the average of what is actually arriving is compared with where
  // the voice should sit, and the gain creeps toward the difference slowly enough
  // that it is never heard moving — only that soft voices arrive louder.
  if (mic.auto) {
    if (voice.autoLevel === false) {
      mic.auto.gain.setTargetAtTime(1, now, 0.15);
    } else if (db > (voice.gate ?? DEFAULT_GATE) - 12) {
      mic.agc = mic.agc == null ? db : mic.agc * 0.88 + db * 0.12;
      const correction = Math.min(18, Math.max(-12, AUTO_TARGET_DB - mic.agc));
      mic.auto.gain.setTargetAtTime(Math.pow(10, correction / 20), now, AUTO_EASE);
    }
  }

  // Noise suppression is a soft downward expander: under the room's floor the
  // signal eases down instead of slamming shut, so fans and hiss fade away
  // while the shape of every word survives.
  const strength = voice.suppressOn === false ? 0 : (voice.suppress ?? 55) / 100;
  if (mic.suppress) {
    const floor = (voice.gate ?? DEFAULT_GATE) + 6;
    const depth = Math.min(1, Math.max(0, (floor - db) / 24)) * 30 * strength;
    mic.suppress.gain.setTargetAtTime(Math.pow(10, -depth / 20), mic.ctx.currentTime, 0.06);
  }

  // The gate is a door that stays shut until your voice crosses the level you
  // chose, then holds open a beat so the ends of words never get clipped. It
  // opens quickly and closes softly, so no word ever starts with a click.
  if (voice.gateOn === false) {
    mic.gate.gain.setTargetAtTime(1, now, 0.05);
    return rms;
  }
  const threshold = voice.gate ?? DEFAULT_GATE;
  if (db >= threshold) last.current = Date.now();
  const open = Date.now() - last.current < 400 ? 1 : 0;
  mic.gate.gain.setTargetAtTime(open, now, open ? 0.012 : 0.12);
  return rms;
}