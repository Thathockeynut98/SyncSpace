// The sleep soundtrack keeps playing while you move between tabs and rooms, and the
// shared countdown can fade it out on its own even if the Sleep screen is not open.
import { signFile } from '@/lib/spaceData';
import { followMediaVolume } from '@/lib/mediaVolume';

let audio = null;
let currentId = null;
let deadline = null;
let watcher = null;
let fade = null;
const listeners = new Set();
let state = { trackId: null, title: '', file_uri: '', playing: false, loading: false };

function emit() {
  listeners.forEach((listener) => listener({ ...state }));
}

export function subscribeSleepPlayback(listener) {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

// What is on right now, and how far into it — handed to the other person so they
// start from the same place.
export function getSleepPlayback() {
  return {
    ...state,
    position: audio && !audio.paused ? audio.currentTime || 0 : 0,
  };
}

function element() {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    followMediaVolume(audio);
    audio.addEventListener('ended', () => {
      state = { ...state, playing: false };
      emit();
    });
  }
  return audio;
}

function clearFade() {
  if (fade) {
    window.clearInterval(fade);
    fade = null;
  }
}

export async function playSleepTrack(track, options = {}) {
  if (!track?.file_uri) return;
  const el = element();
  clearFade();

  if (currentId !== track.id) {
    const url = await signFile(track.file_uri);
    if (!url) return;
    el.src = url;
    currentId = track.id;
  }

  state = {
    ...state,
    trackId: track.id,
    title: track.title || '',
    file_uri: track.file_uri,
    loading: true,
  };
  emit();

  const startAt = Number(options.position);
  try {
    await el.play();
    if (Number.isFinite(startAt) && startAt > 0.5 && Math.abs(el.currentTime - startAt) > 1.5) {
      try {
        el.currentTime = startAt;
      } catch (error) {
        // a browser that will not seek simply starts from the top
      }
    }
    state = { ...state, loading: false, playing: true };
  } catch (error) {
    state = { ...state, loading: false, playing: false };
  }
  emit();
}

export function pauseSleepTrack() {
  clearFade();
  if (audio) audio.pause();
  state = { ...state, playing: false, loading: false };
  emit();
}

export function stopSleepPlaying(trackId) {
  if (!trackId || currentId === trackId) {
    clearFade();
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    currentId = null;
    state = { trackId: null, title: '', file_uri: '', playing: false, loading: false };
    emit();
  }
}

// Hands the engine the countdown's finishing moment, so the music fades out on time.
export function setSleepDeadline(endsAt) {
  deadline = endsAt || null;
  if (watcher) {
    window.clearInterval(watcher);
    watcher = null;
  }
  if (!deadline) return;

  watcher = window.setInterval(() => {
    if (Date.now() < deadline) return;
    window.clearInterval(watcher);
    watcher = null;
    deadline = null;
    fadeOut();
  }, 1000);
}

function fadeOut() {
  if (!audio || audio.paused) return;
  clearFade();
  const el = audio;
  fade = window.setInterval(() => {
    el.volume = Math.max(0, Number((el.volume - 0.1).toFixed(2)));
    if (el.volume > 0.001) return;
    clearFade();
    el.pause();
    state = { ...state, playing: false };
    emit();
  }, 300);
}