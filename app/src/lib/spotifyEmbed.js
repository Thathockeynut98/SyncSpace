// Turns whatever someone pastes — a share link, a Spotify URI, or a bare id —
// into the player address the Spotify embed needs.
const TYPES = 'playlist|album|track|artist|episode|show';

export function spotifyEmbed(input) {
  const raw = (input || '').trim();
  if (!raw) return null;

  const uri = raw.match(new RegExp(`spotify:(${TYPES}):([A-Za-z0-9]+)`));
  if (uri) return build(uri[1], uri[2]);

  const link = raw.match(new RegExp(`open\\.spotify\\.com/(?:intl-[a-z-]+/)?(${TYPES})/([A-Za-z0-9]+)`));
  if (link) return build(link[1], link[2]);

  const bare = raw.match(/^([A-Za-z0-9]{22})$/);
  if (bare) return build('playlist', bare[1]);

  return null;
}

function build(kind, id) {
  return {
    kind,
    id,
    embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
  };
}