export const MOODS = [
  { id: 'glowing', label: 'Glowing', emoji: '✨', tone: 'from-amber-400/25 to-rose-400/15', ring: 'border-amber-300/50' },
  { id: 'happy', label: 'Happy', emoji: '😊', tone: 'from-emerald-400/25 to-teal-400/15', ring: 'border-emerald-300/50' },
  { id: 'loved', label: 'Loved', emoji: '💗', tone: 'from-rose-400/25 to-pink-400/15', ring: 'border-rose-300/50' },
  { id: 'excited', label: 'Excited', emoji: '🎉', tone: 'from-orange-400/25 to-amber-400/15', ring: 'border-orange-300/50' },
  { id: 'grateful', label: 'Grateful', emoji: '🤍', tone: 'from-rose-300/20 to-amber-200/12', ring: 'border-rose-200/40' },
  { id: 'calm', label: 'Calm', emoji: '🌿', tone: 'from-sky-400/25 to-cyan-400/15', ring: 'border-sky-300/50' },
  { id: 'dreamy', label: 'Dreamy', emoji: '☁️', tone: 'from-violet-400/25 to-sky-400/12', ring: 'border-violet-300/50' },
  { id: 'missing', label: 'Missing you', emoji: '💭', tone: 'from-indigo-400/25 to-violet-400/15', ring: 'border-indigo-300/50' },
  { id: 'tired', label: 'Tired', emoji: '🌙', tone: 'from-slate-400/20 to-indigo-400/10', ring: 'border-slate-300/40' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', tone: 'from-violet-500/25 to-slate-500/15', ring: 'border-violet-300/50' },
  { id: 'low', label: 'Low', emoji: '🌧️', tone: 'from-blue-400/25 to-slate-500/15', ring: 'border-blue-300/50' },
  { id: 'stormy', label: 'Stormy', emoji: '⚡', tone: 'from-fuchsia-400/25 to-rose-500/20', ring: 'border-fuchsia-300/50' },
];

export function moodById(id) {
  return MOODS.find((mood) => mood.id === id) || null;
}

export function dayKey(date = new Date()) {
  const value = new Date(date);
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

export function lastDays(count) {
  const days = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    days.push({
      key: dayKey(date),
      letter: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      isToday: index === 0,
    });
  }
  return days;
}

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still awake';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}