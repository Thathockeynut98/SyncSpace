import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const BLOCKED_HOST = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

function decodeEntities(input: string) {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

function htmlToText(html: string) {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|footer|aside|form|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|h[1-6]|li|blockquote|tr|figure)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n· ')
    .replace(/<[^>]+>/g, ' ');

  return decodeEntities(stripped)
    .replace(/\r/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pickTitle(html: string, fallback: string) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const raw = og?.[1] || title?.[1] || h1?.[1] || '';
  const clean = decodeEntities(raw.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return (clean || fallback).slice(0, 90);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: any) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!raw) return Response.json({ error: 'Paste a link first.' }, { status: 400 });

    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    let target: URL;
    try {
      target = new URL(withScheme);
    } catch {
      return Response.json({ error: 'That does not look like a link.' }, { status: 400 });
    }

    if (!/^https?:$/.test(target.protocol) || BLOCKED_HOST.test(target.hostname) || target.hostname.endsWith('.local')) {
      return Response.json({ error: 'That link cannot be opened.' }, { status: 400 });
    }

    const response = await fetch(target.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
      },
    });

    if (!response.ok) {
      return Response.json({ error: 'That page would not open for us.' }, { status: 502 });
    }

    const finalUrl = response.url || target.toString();
    if (BLOCKED_HOST.test(new URL(finalUrl).hostname)) {
      return Response.json({ error: 'That link cannot be opened.' }, { status: 400 });
    }

    const type = response.headers.get('content-type') || '';
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) {
      return Response.json({ error: 'That link is not a page we can read.' }, { status: 415 });
    }

    const html = (await response.text()).slice(0, 900000);
    const text = (/text\/plain/i.test(type) ? html : htmlToText(html)).slice(0, 120000);

    if (text.replace(/\s/g, '').length < 240) {
      return Response.json(
        { error: 'That page kept its text hidden, so there is not enough to read together. Try another link.' },
        { status: 422 }
      );
    }

    return Response.json({
      url: finalUrl,
      title: pickTitle(html, target.hostname.replace(/^www\./, '')),
      text,
    });
  } catch (error: any) {
    return Response.json({ error: 'That link could not be opened just now.' }, { status: 500 });
  }
}