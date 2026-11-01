// Whether a call keeps the screen lit, or lets it go dark while the call carries
// on. Kept on this device, so a phone can sleep and a laptop can stay lit.
const SCREEN_KEY = 'syncspace:callScreen';
const SCREEN_EVENT = 'syncspace:callscreen';

export const SCREEN_MODES = { awake: 'awake', free: 'free' };

export function loadScreenMode() {
  try {
    const saved = localStorage.getItem(SCREEN_KEY);
    return saved === SCREEN_MODES.free ? SCREEN_MODES.free : SCREEN_MODES.awake;
  } catch (error) {
    return SCREEN_MODES.awake;
  }
}

export function saveScreenMode(mode) {
  const next = mode === SCREEN_MODES.free ? SCREEN_MODES.free : SCREEN_MODES.awake;
  try {
    localStorage.setItem(SCREEN_KEY, next);
  } catch (error) {
    // a private window just will not remember it
  }
  // Other tabs of the same space follow along.
  window.dispatchEvent(new CustomEvent(SCREEN_EVENT));
  return next;
}

export function subscribeScreenMode(handler) {
  window.addEventListener(SCREEN_EVENT, handler);
  return () => window.removeEventListener(SCREEN_EVENT, handler);
}

// One second of true silence, built here so nothing has to be shipped for it.
// While a call that may sleep is running, this keeps playing: the browser counts
// the line as sound still coming in, and leaves it up behind a dark screen.
let silenceUrl = null;

export function silenceLoopUrl() {
  if (silenceUrl) return silenceUrl;
  const rate = 8000;
  const samples = rate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // plain uncompressed samples
  view.setUint16(22, 1, true); // one channel
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples * 2, true);
  silenceUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  return silenceUrl;
}