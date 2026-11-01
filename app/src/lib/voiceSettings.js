import { VOICE_PRESETS } from './voiceChain';

export const VOICE_KEY = 'syncspace:voice';

export const DEFAULT_VOICE = {
  gate: -48,
  gateOn: true,
  sensitivity: 100,
  suppress: 55,
  suppressOn: true,
  loudness: 1.2,
  their: 1.2,
  bass: 2,
  clarity: 2.5,
  air: -2,
  autoLevel: true,
  preset: 'natural',
  isolation: true,
};

// The voice settings live on this device only, and always come back in range:
// a saved value from an older version never breaks a call.
export function loadVoice() {
  try {
    const saved = JSON.parse(localStorage.getItem(VOICE_KEY) || '{}');
    const gate = Number.isFinite(saved.gate) ? Math.min(-20, Math.max(-70, saved.gate)) : DEFAULT_VOICE.gate;
    const gateOn = typeof saved.gateOn === 'boolean' ? saved.gateOn : DEFAULT_VOICE.gateOn;
    const rawSensitivity = Number.isFinite(saved.sensitivity) ? saved.sensitivity : DEFAULT_VOICE.sensitivity;
    const sensitivity = Math.min(200, Math.max(0, rawSensitivity));
    const rawSuppress = Number.isFinite(saved.suppress) ? saved.suppress : DEFAULT_VOICE.suppress;
    const suppress = Math.min(100, Math.max(0, rawSuppress));
    const suppressOn = typeof saved.suppressOn === 'boolean' ? saved.suppressOn : DEFAULT_VOICE.suppressOn;
    const loudness = Number.isFinite(saved.loudness)
      ? Math.min(3, Math.max(0.5, saved.loudness))
      : DEFAULT_VOICE.loudness;
    const their = Number.isFinite(saved.their) ? Math.min(2, Math.max(0, saved.their)) : DEFAULT_VOICE.their;
    const bass = Number.isFinite(saved.bass) ? Math.min(12, Math.max(-12, saved.bass)) : DEFAULT_VOICE.bass;
    const clarity = Number.isFinite(saved.clarity)
      ? Math.min(10, Math.max(-4, saved.clarity))
      : DEFAULT_VOICE.clarity;
    const air = Number.isFinite(saved.air) ? Math.min(6, Math.max(-8, saved.air)) : DEFAULT_VOICE.air;
    const autoLevel = typeof saved.autoLevel === 'boolean' ? saved.autoLevel : DEFAULT_VOICE.autoLevel;
    const preset =
      typeof saved.preset === 'string' && saved.preset in VOICE_PRESETS ? saved.preset : DEFAULT_VOICE.preset;
    const isolation = typeof saved.isolation === 'boolean' ? saved.isolation : DEFAULT_VOICE.isolation;
    return {
      gate,
      gateOn,
      sensitivity,
      suppress,
      suppressOn,
      loudness,
      their,
      bass,
      clarity,
      air,
      autoLevel,
      preset,
      isolation,
    };
  } catch (error) {
    return DEFAULT_VOICE;
  }
}