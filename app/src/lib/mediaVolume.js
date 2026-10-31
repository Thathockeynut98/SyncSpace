// One volume for everything that plays here — songs, stations, the sleep
// soundtrack — so you never hunt for the right slider. It lives outside React
// so a level you set on one tab still holds on another.

const KEY = 'syncspace.media-volume';
const listeners = new Set();
const appliers = new Set();

function clamp(next) {
  return Math.max(0, Math.min(1, next));
}

function read() {
  try {
    const stored = Number(window.localStorage.getItem(KEY));
    if (Number.isFinite(stored)) return clamp(stored);
  } catch (error) {
    /* private mode simply keeps the default */
  }
  return 0.85;
}

let volume = read();

export function getMediaVolume() {
  return volume;
}

export function subscribeMediaVolume(listener) {
  listeners.add(listener);
  listener(volume);
  return () => listeners.delete(listener);
}

export function setMediaVolume(next) {
  volume = clamp(next);
  try {
    window.localStorage.setItem(KEY, String(volume));
  } catch (error) {
    /* private mode simply forgets it */
  }
  appliers.forEach((apply) => apply(volume));
  listeners.forEach((listener) => listener(volume));
}

// A player hands us its element and then follows the one slider.
export function followMediaVolume(el) {
  if (!el) return () => {};
  const apply = (level) => {
    el.volume = level;
  };
  el.volume = volume;
  appliers.add(apply);
  return () => appliers.delete(apply);
}