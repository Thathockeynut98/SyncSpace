import { useEffect, useState } from 'react';

const STORAGE_KEY = 'syncspace.appearance';

export const ACCENTS = [
  {
    id: 'indigo',
    label: 'Midnight',
    swatch: 'bg-indigo-500',
    vars: {
      '--primary': '239 84% 67%',
      '--accent': '271 81% 66%',
      '--ring': '239 84% 67%',
      '--aura-1': '245 82% 62%',
      '--aura-2': '300 82% 68%',
      '--aura-3': '258 84% 66%',
      '--aura-4': '190 90% 55%',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: 'bg-rose-500',
    vars: {
      '--primary': '346 84% 62%',
      '--accent': '322 81% 64%',
      '--ring': '346 84% 62%',
      '--aura-1': '346 84% 62%',
      '--aura-2': '322 84% 66%',
      '--aura-3': '10 84% 62%',
      '--aura-4': '285 80% 62%',
    },
  },
  {
    id: 'amber',
    label: 'Amber',
    swatch: 'bg-amber-500',
    vars: {
      '--primary': '32 92% 58%',
      '--accent': '16 86% 58%',
      '--ring': '32 92% 58%',
      '--aura-1': '32 92% 56%',
      '--aura-2': '14 88% 58%',
      '--aura-3': '45 94% 58%',
      '--aura-4': '2 82% 58%',
    },
  },
  {
    id: 'emerald',
    label: 'Moss',
    swatch: 'bg-emerald-500',
    vars: {
      '--primary': '160 70% 45%',
      '--accent': '172 72% 46%',
      '--ring': '160 70% 45%',
      '--aura-1': '160 70% 44%',
      '--aura-2': '182 68% 46%',
      '--aura-3': '140 62% 46%',
      '--aura-4': '195 72% 50%',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    swatch: 'bg-sky-500',
    vars: {
      '--primary': '199 89% 55%',
      '--accent': '188 86% 50%',
      '--ring': '199 89% 55%',
      '--aura-1': '199 89% 55%',
      '--aura-2': '180 80% 48%',
      '--aura-3': '215 88% 62%',
      '--aura-4': '160 70% 48%',
    },
  },
  {
    id: 'lilac',
    label: 'Lilac',
    swatch: 'bg-violet-400',
    vars: {
      '--primary': '262 82% 70%',
      '--accent': '288 76% 68%',
      '--ring': '262 82% 70%',
      '--aura-1': '262 82% 70%',
      '--aura-2': '290 78% 70%',
      '--aura-3': '240 80% 68%',
      '--aura-4': '315 74% 68%',
    },
  },
];

export const WALLPAPERS = [
  {
    id: 'aurora',
    label: 'Aurora',
    hint: 'Drifting lights',
    layer: 'wallpaper-aurora',
    preview: 'from-indigo-600 via-violet-500 to-fuchsia-500',
  },
  {
    id: 'starry',
    label: 'Starry',
    hint: 'Quiet night sky',
    layer: 'wallpaper-starry',
    preview: 'from-slate-950 via-indigo-950 to-slate-900',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    hint: 'Warm horizon',
    layer: 'wallpaper-sunset',
    preview: 'from-rose-500 via-orange-400 to-amber-300',
  },
  {
    id: 'forest',
    label: 'Forest',
    hint: 'Green and calm',
    layer: 'wallpaper-forest',
    preview: 'from-emerald-800 via-teal-800 to-emerald-600',
  },
  {
    id: 'linen',
    label: 'Linen',
    hint: 'Plain and warm',
    layer: 'wallpaper-linen',
    preview: 'from-stone-300 via-stone-400 to-stone-500',
  },
];

const DEFAULTS = { theme: 'dark', accent: 'indigo', wallpaper: 'aurora' };

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch (error) {
    return { ...DEFAULTS };
  }
}

let current = readStored();
const listeners = new Set();

function apply() {
  const root = document.documentElement;
  const accent = ACCENTS.find((item) => item.id === current.accent) || ACCENTS[0];
  root.dataset.theme = current.theme;
  root.dataset.wallpaper = current.wallpaper;
  Object.entries(accent.vars).forEach(([token, value]) => root.style.setProperty(token, value));
}

export function updateAppearance(patch) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (error) {
    // A blocked storage just means the choice lasts for this visit.
  }
  apply();
  listeners.forEach((listener) => listener(current));
}

export function useAppearance() {
  const [state, setState] = useState(current);

  useEffect(() => {
    const listener = (next) => setState(next);
    listeners.add(listener);
    setState(current);
    return () => listeners.delete(listener);
  }, []);

  return [state, updateAppearance];
}

apply();