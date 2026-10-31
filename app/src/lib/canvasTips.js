// Brush tips: instead of one smooth line, a stroke is built from little shapes
// (bristles, chalk dust, sparkles, your own uploaded textures) stamped along the path.
const TIP_BOX = 96;
const cache = new Map();
const textures = new Map();

export const BUILT_IN_TIPS = [
  { id: 'round', label: 'Round' },
  { id: 'bristle', label: 'Bristle' },
  { id: 'chalk', label: 'Chalk' },
  { id: 'grain', label: 'Sand' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'fur', label: 'Fur' },
  { id: 'bubbles', label: 'Bubbles' },
  { id: 'petals', label: 'Petals' },
];

function starShape(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const reach = i % 2 ? radius * 0.3 : radius;
    const x = cx + Math.cos(angle) * reach;
    const y = cy + Math.sin(angle) * reach;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

const ART = {
  bristle(ctx, size) {
    const strands = 8;
    for (let i = 0; i < strands; i += 1) {
      const x = size * (0.18 + (i / (strands - 1)) * 0.64);
      ctx.globalAlpha = 0.35 + Math.random() * 0.55;
      ctx.lineWidth = size * (0.03 + Math.random() * 0.035);
      ctx.beginPath();
      ctx.moveTo(x + (Math.random() - 0.5) * size * 0.03, size * (0.1 + Math.random() * 0.12));
      ctx.lineTo(x, size * (0.74 + Math.random() * 0.16));
      ctx.stroke();
    }
  },
  chalk(ctx, size) {
    for (let i = 0; i < 130; i += 1) {
      ctx.globalAlpha = 0.05 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.arc(
        size * (0.12 + Math.random() * 0.76),
        size * (0.12 + Math.random() * 0.76),
        size * (0.006 + Math.random() * 0.02),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  },
  grain(ctx, size) {
    for (let i = 0; i < 60; i += 1) {
      ctx.globalAlpha = 0.35 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.arc(
        size * (0.14 + Math.random() * 0.72),
        size * (0.14 + Math.random() * 0.72),
        size * (0.015 + Math.random() * 0.035),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  },
  sparkle(ctx, size) {
    [
      [0.36, 0.36, 0.22],
      [0.64, 0.56, 0.16],
      [0.46, 0.72, 0.12],
    ].forEach(([x, y, r]) => {
      ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      starShape(ctx, size * x, size * y, size * r);
    });
  },
  fur(ctx, size) {
    const hairs = 16;
    for (let i = 0; i < hairs; i += 1) {
      const angle = (i / hairs) * Math.PI * 2;
      const inner = size * 0.04;
      const outer = size * (0.24 + Math.random() * 0.22);
      ctx.globalAlpha = 0.45 + Math.random() * 0.5;
      ctx.lineWidth = size * 0.016;
      ctx.beginPath();
      ctx.moveTo(size / 2 + Math.cos(angle) * inner, size / 2 + Math.sin(angle) * inner);
      ctx.lineTo(size / 2 + Math.cos(angle) * outer, size / 2 + Math.sin(angle) * outer);
      ctx.stroke();
    }
  },
  bubbles(ctx, size) {
    [
      [0.4, 0.42, 0.2],
      [0.66, 0.6, 0.14],
      [0.52, 0.7, 0.1],
    ].forEach(([x, y, r]) => {
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = size * (0.02 + r * 0.03);
      ctx.beginPath();
      ctx.arc(size * x, size * y, size * r, 0, Math.PI * 2);
      ctx.stroke();
    });
  },
  petals(ctx, size) {
    const count = 5;
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        size / 2 + Math.cos(angle) * size * 0.16,
        size / 2 + Math.sin(angle) * size * 0.16,
        size * 0.13,
        size * 0.075,
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  },
};

// Loads an uploaded texture so it can be stamped without tainting the page.
export async function registerTexture(id, url) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('That image could not be read.'));
    element.src = objectUrl;
  });
  textures.set(id, image);
  return true;
}

export function hasTexture(id) {
  return textures.has(id);
}

function tipCanvas(id, color) {
  const key = `${id}|${color}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const box = document.createElement('canvas');
  box.width = TIP_BOX;
  box.height = TIP_BOX;
  const ctx = box.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (id.startsWith('custom:')) {
    const image = textures.get(id);
    if (!image?.width) return null;
    const scale = Math.max(TIP_BOX / image.width, TIP_BOX / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (TIP_BOX - width) / 2, (TIP_BOX - height) / 2, width, height);
  } else {
    const art = ART[id];
    if (!art) return null;
    art(ctx, TIP_BOX);
  }

  // Loaded tips take on the colour you picked.
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TIP_BOX, TIP_BOX);
  ctx.globalCompositeOperation = 'source-over';

  cache.set(key, box);
  if (cache.size > 160) cache.delete(cache.keys().next().value);
  return box;
}

export function stampTip(ctx, id, color, x, y, size, angle = 0) {
  const tip = tipCanvas(id, color);
  if (!tip) return;
  const side = Math.max(3, size * 1.8);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(tip, -side / 2, -side / 2, side, side);
  ctx.restore();
}

// A short curvy sample of a tip, used by the little swatches.
export function drawTipSample(ctx, id, color, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (id === 'round') {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, height * 0.16);
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.62);
    ctx.quadraticCurveTo(width * 0.34, height * 0.1, width * 0.56, height * 0.52);
    ctx.quadraticCurveTo(width * 0.74, height * 0.88, width * 0.94, height * 0.38);
    ctx.stroke();
    return;
  }

  const steps = 26;
  const size = Math.max(6, height * 0.52);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = width * 0.06 + t * width * 0.88;
    const y = height * 0.5 + Math.sin(t * Math.PI * 1.7) * height * 0.22;
    const slope =
      (Math.cos(t * Math.PI * 1.7) * height * 0.22 * Math.PI * 1.7) / (width * 0.88);
    stampTip(ctx, id, color, x, y, size, Math.atan(slope) + Math.PI / 2);
  }
}