import { useEffect, useState } from 'react';

const STORAGE_KEY = 'syncspace.watchSize';

export const WATCH_SIZES = [
  { id: 'standard', label: 'Standard', hint: 'Video and list side by side' },
  { id: 'large', label: 'Large', hint: 'A wider picture, list kept close' },
  { id: 'cinema', label: 'Cinema', hint: 'The video across the whole screen' },
];

let current = 'standard';
const listeners = new Set();

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (WATCH_SIZES.some((size) => size.id === saved)) current = saved;
} catch (error) {
  // Storage blocked: the choice simply lasts for this visit.
}

export function setWatchSize(size) {
  current = size;
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch (error) {
    // Ignored for the same reason as above.
  }
  listeners.forEach((listener) => listener(current));
}

export function useWatchSize() {
  const [size, setSize] = useState(current);

  useEffect(() => {
    const listener = (next) => setSize(next);
    listeners.add(listener);
    setSize(current);
    return () => listeners.delete(listener);
  }, []);

  return [size, setWatchSize];
}