// Adaptive quality for a call: a ladder the picture climbs down when the line
// thins and back up when it recovers. The picture always gives way first, so the
// voices and the connection itself stay whole on a weak network.
export const VIDEO_TIERS = [
  { id: 'full', scale: 1, fps: 60, screen: 12000000, camera: 6000000 },
  { id: 'high', scale: 1, fps: 30, screen: 5000000, camera: 3000000 },
  { id: 'medium', scale: 1.5, fps: 24, screen: 2500000, camera: 1600000 },
  { id: 'low', scale: 2, fps: 20, screen: 1200000, camera: 900000 },
  // Barely a picture, but the voices come through untouched.
  { id: 'voice-first', scale: 3, fps: 15, screen: 450000, camera: 350000 },
];

// Where the picture sits when it is not left to climb on its own: the top rung for
// the clearest picture the line can carry, a small light one when the call matters
// more than the detail.
export const QUALITY_MODES = {
  auto: null,
  quality: 0,
  performance: VIDEO_TIERS.length - 2,
};

// How much of the line a tier wants before it is worn: the bitrate it was given,
// with a little headroom so it is not sitting exactly at the edge.
function need(tier, mode) {
  return (mode === 'screen' ? tier.screen : tier.camera) * 1.15;
}

// Climbing back up waits for the line to hold its gain, so a wavering connection
// does not flicker between sizes.
const RAMP_READS = 2;

export function createQualityTuner() {
  let index = 0;
  let held = 0;
  let setting = 'auto';

  const tune = (next) => {
    index = Math.min(VIDEO_TIERS.length - 1, Math.max(0, next));
  };

  return {
    get index() {
      return index;
    },
    get tier() {
      return VIDEO_TIERS[index];
    },
    get setting() {
      return setting;
    },
    reset() {
      held = 0;
      index = QUALITY_MODES[setting] ?? 0;
    },
    // Held by hand, the picture stays on its rung whatever the line is doing.
    setSetting(next) {
      setting = next in QUALITY_MODES ? next : 'auto';
      held = 0;
      const pinned = QUALITY_MODES[setting];
      if (pinned != null) index = pinned;
      return { index, tier: VIDEO_TIERS[index] };
    },
    // One reading of what the line can carry. Steps down at once, straight to the
    // rung that fits; steps up one rung at a time, and only once it has held.
    read(available, mode) {
      const before = index;
      if (QUALITY_MODES[setting] != null) return { index, tier: VIDEO_TIERS[index], changed: false };
      if (available < need(VIDEO_TIERS[index], mode) * 0.85) {
        held = 0;
        let next = index;
        while (next < VIDEO_TIERS.length - 1 && available < need(VIDEO_TIERS[next], mode) * 0.85) {
          next += 1;
        }
        tune(next);
      } else if (index > 0 && available > need(VIDEO_TIERS[index - 1], mode) * 1.25) {
        held += 1;
        if (held >= RAMP_READS) {
          held = 0;
          tune(index - 1);
        }
      } else {
        held = 0;
      }
      return { index, tier: VIDEO_TIERS[index], changed: index !== before };
    },
  };
}