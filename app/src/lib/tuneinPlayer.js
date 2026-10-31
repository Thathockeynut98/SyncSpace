// The TuneIn stream player lives outside React, so a station keeps playing while
// you move between tabs. Any component can subscribe to what is on.

import { followMediaVolume } from '@/lib/mediaVolume';

let audio = null;
let state = { stationId: null, name: null, genre: null, status: 'idle', error: '' };
const listeners = new Set();

function emit(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

function element() {
  if (audio || typeof Audio === 'undefined') return audio;
  audio = new Audio();
  audio.preload = 'none';
  followMediaVolume(audio);
  audio.addEventListener('playing', () => emit({ status: 'playing', error: '' }));
  audio.addEventListener('waiting', () => emit({ status: 'loading' }));
  audio.addEventListener('pause', () => {
    if (state.status === 'playing') emit({ status: 'paused' });
  });
  audio.addEventListener('error', () => {
    if (!state.stationId) return;
    emit({ stationId: null, name: null, genre: null, status: 'idle', error: 'That station would not start. Pick another one.' });
  });
  return audio;
}

export function getTuneInState() {
  return state;
}

export function subscribeTuneIn(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export async function playStation(station) {
  const el = element();
  if (!el) return;
  const switching = state.stationId !== station.id;
  emit({
    stationId: station.id,
    name: station.name,
    genre: station.genre,
    status: 'loading',
    error: '',
  });
  if (switching) el.src = station.stream;
  try {
    await el.play();
  } catch {
    emit({ stationId: null, name: null, genre: null, status: 'idle', error: 'That station would not start. Pick another one.' });
  }
}

export function toggleStation() {
  const el = element();
  if (!el || !state.stationId) return;
  if (el.paused) el.play().catch(() => {});
  else el.pause();
}

export function stopStation() {
  const el = element();
  if (!el) return;
  el.pause();
  emit({ stationId: null, name: null, genre: null, status: 'idle', error: '' });
  el.removeAttribute('src');
  el.load();
}