// The paper the two of you draw on, shared with every stroke.
export const DEFAULT_PAPER = '#080b16';

export const PAPERS = [
  { id: 'midnight', label: 'Midnight', value: '#080b16' },
  { id: 'ink', label: 'Ink', value: '#111827' },
  { id: 'violet', label: 'Violet', value: '#1b1233' },
  { id: 'teal', label: 'Deep teal', value: '#0d2529' },
  { id: 'blush', label: 'Blush', value: '#2a1526' },
  { id: 'slate', label: 'Slate', value: '#243043' },
  { id: 'bone', label: 'Bone', value: '#efe6d5' },
  { id: 'rose', label: 'Rose', value: '#f3d9df' },
];

export const isPaperColour = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);