// Station favorites, remembered on this device so they survive a reload.

const KEY = 'syncspace:tunein:favorites';
const listeners = new Set();

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let favorites = read();

function publish() {
  localStorage.setItem(KEY, JSON.stringify(favorites));
  listeners.forEach((fn) => fn(favorites));
}

export function getFavorites() {
  return favorites;
}

export function subscribeFavorites(fn) {
  listeners.add(fn);
  fn(favorites);
  return () => listeners.delete(fn);
}

export function toggleFavorite(id) {
  favorites = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
  publish();
}