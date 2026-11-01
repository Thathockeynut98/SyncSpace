import { useEffect, useState } from 'react';

// How sharp the picture is allowed to be while you watch together. Kept on this
// device, so whoever is on a thin connection can drop the picture down without
// touching what the other one sees.

const STORAGE_KEY = 'syncspace.pictureQuality';

export const PICTURE_QUALITIES = [
  {
    id: 'sharp',
    label: 'Sharpest',
    hint: '1440p and up, when the link can carry it',
    youtube: 'hd1440',
    range: ['hd1440', 'highres'],
  },
  {
    id: 'hd',
    label: 'HD',
    hint: '1080p, a lighter load on the line',
    youtube: 'hd1080',
    range: ['hd1080', 'hd1080'],
  },
  {
    id: 'auto',
    label: 'Auto',
    hint: 'The player picks for your connection',
    youtube: 'default',
    range: null,
  },
  {
    id: 'saver',
    label: 'Data saver',
    hint: '480p, kindest to a thin connection',
    youtube: 'large',
    range: ['large', 'large'],
  },
];

const DEFAULT_QUALITY = 'auto';

let current = DEFAULT_QUALITY;
const listeners = new Set();

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (PICTURE_QUALITIES.some((quality) => quality.id === saved)) current = saved;
} catch (error) {
  // Storage blocked: the choice simply lasts for this visit.
}

export function getPictureQuality() {
  const found = PICTURE_QUALITIES.find((quality) => quality.id === current);
  return found || PICTURE_QUALITIES[0];
}

export function setPictureQuality(id) {
  if (!PICTURE_QUALITIES.some((quality) => quality.id === id)) return;
  current = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (error) {
    // Ignored for the same reason as above.
  }
  listeners.forEach((listener) => listener(id));
}

export function subscribePictureQuality(listener) {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function usePictureQuality() {
  const [id, setId] = useState(current);

  useEffect(() => subscribePictureQuality(setId), []);

  return [id, setPictureQuality];
}