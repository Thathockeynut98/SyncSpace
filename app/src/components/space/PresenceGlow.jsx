// A tiny in-app glow on an avatar: lit while that person is in the space.
export default function PresenceGlow({ label }) {
  return (
    <span
      title={label}
      className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center"
    >
      <span className="absolute inset-0 rounded-full bg-emerald-400/60 blur-[3px]" />
      <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300 ring-2 ring-background" />
    </span>
  );
}