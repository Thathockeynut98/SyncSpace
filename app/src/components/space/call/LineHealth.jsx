const STATES = {
  steady: {
    label: 'Connection steady',
    tint: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100',
    dot: 'bg-emerald-400',
  },
  straining: {
    label: 'Line is struggling',
    tint: 'border-amber-400/30 bg-amber-500/15 text-amber-100',
    dot: 'bg-amber-400',
  },
  lost: {
    label: 'Reconnecting…',
    tint: 'border-rose-400/30 bg-rose-500/15 text-rose-100',
    dot: 'bg-rose-400',
  },
};

// A quiet read of how the line is holding up, so a call that starts dropping is
// explained rather than just felt.
export default function LineHealth({ line }) {
  const state = STATES[line];
  if (!state) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] ${state.tint}`}
      title="How well the call is holding up"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
      {state.label}
    </span>
  );
}