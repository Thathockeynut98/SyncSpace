import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  const base44 = createClientFromRequest(req);
  await base44.auth.me();
  const { stationId } = await req.json().catch(() => ({}));
  const id = stationId || 's28807';
  const res = await fetch(
    `https://opml.radiotime.com/Tune.ashx?id=${id}&formats=mp3,aac&render=json`,
    { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
  );
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text.slice(text.indexOf('{'))); } catch { /* ignore */ }
  const items = (parsed?.body || []).map((i) => ({
    element: i.element,
    url: (i.url || '').slice(0, 140),
    media_type: i.media_type,
    bitrate: i.bitrate,
    text: i.text,
  }));
  const hls = await fetch(
    `https://opml.radiotime.com/Tune.ashx?id=${id}&formats=mp3,aac,ogg,hls&render=json`,
    { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  const hlsText = await hls.text();
  return Response.json({ status: res.status, head: parsed?.head, items, hlsHead: hlsText.slice(0, 400) });
}