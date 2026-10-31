// Stored timestamps arrive from the server as UTC without a zone marker
// (e.g. "2026-10-27T02:10:20.045000"). Browsers read such strings as local time,
// which shifts every label by the viewer's UTC offset. Read them as UTC once,
// here, then every label follows the browser's own clock and timezone.

export function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = String(value).trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const date = new Date(hasZone ? text : `${text.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function clockTime(value) {
  const date = asDate(value);
  if (!date) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function shortDay(value) {
  const date = asDate(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function monthYear(value) {
  const date = asDate(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}