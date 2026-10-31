// The library's song player lives outside React, so a track keeps playing
// while you move between tabs. Both of you drive the same one.
import { followMediaVolume } from '@/lib/mediaVolume';

let audio = null;
let resolver = null;
let lastTick = 0;

let state = {
  queue: [],
  index: -1,
  item: null,
  playing: false,
  position: 0,
  duration: 0,
  repeat: 'off',
  shuffle: false,
  error: '',
};

const listeners = new Set();

function emit(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

export function getLibraryState() {
  return state;
}

export function subscribeLibrary(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function setTrackResolver(fn) {
  resolver = fn;
}

function element() {
  if (audio || typeof Audio === 'undefined') return audio;
  audio = new Audio();
  audio.preload = 'auto';
  followMediaVolume(audio);
  audio.addEventListener('playing', () => emit({ playing: true, error: '' }));
  audio.addEventListener('pause', () => {
    if (!audio.ended) emit({ playing: false });
  });
  audio.addEventListener('loadedmetadata', () =>
    emit({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 })
  );
  audio.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastTick < 500) return;
    lastTick = now;
    emit({ position: audio.currentTime || 0 });
  });
  audio.addEventListener('ended', () => nextTrack(true));
  audio.addEventListener('error', () => {
    if (!state.item) return;
    emit({ playing: false, error: 'That one would not play here.' });
  });
  return audio;
}

async function startAt(queue, index, { position = 0, autoplay = true } = {}) {
  const item = queue[index];
  if (!item) return;
  emit({
    queue,
    index,
    item,
    position,
    duration: item.duration_seconds || 0,
    playing: autoplay,
    error: '',
  });

  const el = element();
  if (!el || !resolver) return;
  try {
    const url = await resolver(item);
    if (state.item?.id !== item.id) return;
    if (el.src !== url) el.src = url;
    try {
      el.currentTime = position || 0;
    } catch (err) {
      // metadata not ready yet; playback simply starts from the beginning
    }
    if (autoplay) await el.play();
    else el.pause();
  } catch (err) {
    emit({ playing: false, error: 'That one would not play here. Tap it again.' });
  }
}

export function setQueue(items) {
  const queue = Array.isArray(items) ? items : [];
  const index = state.item ? queue.findIndex((entry) => entry.id === state.item.id) : -1;
  emit({ queue, index });
}

export function playItem(item, options = {}) {
  if (!item) return;
  let queue = state.queue;
  if (!queue.some((entry) => entry.id === item.id)) queue = [item, ...queue];
  const index = queue.findIndex((entry) => entry.id === item.id);
  return startAt(queue, index, options);
}

export function togglePlay() {
  const el = element();
  if (!el || !state.item) return;
  if (state.playing) el.pause();
  else el.play().catch(() => emit({ playing: false }));
}

export function nextTrack(auto = false) {
  const { queue, index, repeat, shuffle } = state;
  if (!queue.length) return;
  if (auto && repeat === 'one') {
    const el = element();
    if (el) {
      el.currentTime = 0;
      el.play().catch(() => {});
      return;
    }
  }
  let next = index;
  if (shuffle && queue.length > 1) {
    do {
      next = Math.floor(Math.random() * queue.length);
    } while (next === index);
  } else {
    next = index + 1;
    if (next >= queue.length) {
      if (auto && repeat !== 'all') {
        const el = element();
        el?.pause();
        emit({ playing: false, position: 0 });
        return;
      }
      next = 0;
    }
  }
  return startAt(queue, next, { autoplay: true });
}

export function previousTrack() {
  const { queue, index } = state;
  if (!queue.length) return;
  const prev = index <= 0 ? queue.length - 1 : index - 1;
  return startAt(queue, prev, { autoplay: true });
}

export function setRepeatMode(mode) {
  emit({ repeat: mode });
}

export function setShuffle(on) {
  emit({ shuffle: !!on });
}

export function stopTrack() {
  const el = element();
  if (el) {
    el.pause();
    el.removeAttribute('src');
    el.load();
  }
  emit({ item: null, index: -1, playing: false, position: 0, duration: 0 });
}