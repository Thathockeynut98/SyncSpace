const DIRECT_MEDIA = /\.(mp4|m4v|webm|ogv|ogg|mov)(\?|#|$)/i;

const youtubeId = (url, host) => {
  if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'watch') return url.searchParams.get('v');
  if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) return parts[1] || null;
  return url.searchParams.get('v');
};

export function stripToUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const explicit = /^https?:\/\//i.test(trimmed);
  try {
    const url = new URL(explicit ? trimmed : `https://${trimmed}`);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (!explicit && !url.hostname.includes('.')) return null;
    return url;
  } catch (err) {
    return null;
  }
}

export function parseLink(value) {
  const url = stripToUrl(value);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const id = youtubeId(url, host);
  if (id) return { kind: 'youtube', id, host: 'YouTube', url: url.toString() };
  if (DIRECT_MEDIA.test(url.pathname)) return { kind: 'file', host, url: url.toString() };
  return { kind: 'page', host, url: url.toString() };
}

export function linkTitle(parsed) {
  if (!parsed) return 'Pasted link';
  if (parsed.kind === 'youtube') return 'YouTube video';
  try {
    const url = new URL(parsed.url);
    const last = url.pathname.split('/').filter(Boolean).pop() || '';
    const cleaned = decodeURIComponent(last)
      .replace(/\.[^.]+$/, '')
      .replace(/[-_+]+/g, ' ')
      .trim();
    return (cleaned || parsed.host).slice(0, 80);
  } catch (err) {
    return parsed.host || 'Pasted link';
  }
}

export function linkHost(value) {
  const parsed = parseLink(value);
  return parsed ? parsed.host : 'link';
}