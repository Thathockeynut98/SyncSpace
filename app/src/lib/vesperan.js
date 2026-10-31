import { base44 } from '@/api/base44Client';

// The Vesperan codex doubles as a dictionary: English in, Vesperan out.
let cache = null;
let pending = null;

const WORD = /[\p{L}\p{M}]/u;
const SPLIT = /([^\p{L}\p{M}'’]+)/u;

export async function loadVesperan() {
  if (cache) return cache;
  if (!pending) {
    pending = base44.entities.CodexEntry.filter({}, { sort: 'order', limit: 1000 })
      .then((page) => {
        const map = new Map();
        page.items.forEach((entry) => {
          const key = (entry.english_lc || entry.english || '').toLowerCase().trim();
          if (key && entry.vesperan && !map.has(key)) map.set(key, entry.vesperan);
        });
        cache = map;
        return map;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

// Keeps punctuation and word order, prefers longer phrases ("how are you")
// over single words, and leaves anything the codex doesn't know untouched.
export function translateToVesperan(text, dict) {
  if (!dict || !text.trim()) return '';
  const parts = text.split(SPLIT);
  const words = [];
  parts.forEach((part, index) => {
    if (WORD.test(part)) words.push(index);
  });

  const result = [...parts];
  let position = 0;

  while (position < words.length) {
    let hit = false;

    for (let span = 3; span >= 1; span -= 1) {
      const window = words.slice(position, position + span);
      if (window.length < span) continue;

      let joined = true;
      for (let index = 0; index < window.length - 1; index += 1) {
        const gap = parts.slice(window[index] + 1, window[index + 1]);
        if (gap.some((piece) => !/^\s$/.test(piece))) {
          joined = false;
          break;
        }
      }
      if (!joined) continue;

      const phrase = window.map((index) => parts[index]).join(' ').toLowerCase();
      const replacement = dict.get(phrase);
      if (!replacement) continue;

      result[window[0]] = replacement;
      for (let index = 1; index < window.length; index += 1) {
        for (let piece = window[index - 1] + 1; piece <= window[index]; piece += 1) {
          result[piece] = '';
        }
      }
      position += span;
      hit = true;
      break;
    }

    if (!hit) {
      const index = words[position];
      const single = dict.get(parts[index].toLowerCase());
      if (single) result[index] = single;
      position += 1;
    }
  }

  return result.join('').replace(/\s{2,}/g, ' ').trim();
}