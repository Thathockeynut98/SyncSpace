// Turns a whole book of plain text into pages you can both be on at the same time.
const PAGE_LIMIT = 1400;

export function paginate(rawText) {
  const clean = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!clean) return ['There is nothing in this one yet.'];

  const paragraphs = clean.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const pages = [];
  let current = '';

  const flush = () => {
    if (current.trim()) pages.push(current.trim());
    current = '';
  };

  paragraphs.forEach((paragraph) => {
    const pieces = paragraph.length > PAGE_LIMIT ? paragraph.match(new RegExp(`[\\s\\S]{1,${PAGE_LIMIT}}`, 'g')) : [paragraph];
    pieces.forEach((piece) => {
      if (current && current.length + piece.length + 2 > PAGE_LIMIT) flush();
      current = current ? `${current}\n\n${piece}` : piece;
    });
  });

  flush();
  return pages.length ? pages : ['There is nothing in this one yet.'];
}

export function readingTime(pageText) {
  const words = String(pageText || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}