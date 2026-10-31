// Remounting the player is what silences Spotify when the countdown ends —
// a fresh embed never picks up playing on its own.
export default function SpotifySleepEmbed({ embedUrl, stopKey }) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <iframe
        key={stopKey}
        title="Spotify playlist"
        src={embedUrl}
        width="100%"
        height="232"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        style={{ border: 0, display: 'block' }}
      />
    </div>
  );
}