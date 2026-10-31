// Everything the shared canvas knows about putting marks on a page: the tools,
// the mirror maths, and the brush behaviour for each tool.
import { drawStencilShape, readStencilKey } from './canvasStencils';
import { stampTip } from './canvasTips';

export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 1000;

export const SHAPE_TOOLS = ['line', 'rect', 'ellipse'];
export const TOOL_IDS = [
  'pen',
  'pencil',
  'marker',
  'calligraphy',
  'charcoal',
  'watercolor',
  'neon',
  'rainbow',
  'airbrush',
  'roller',
  'eraser',
  'fill',
  'line',
  'rect',
  'ellipse',
  'stamp',
  'stencil',
];
export const MIRROR_MODES = ['off', 'v', 'h', 'quad'];
export const TIP_TOOLS = ['pen', 'pencil', 'marker', 'airbrush', 'roller', 'eraser'];

// A stroke built from a texture tip rather than a smooth line.
export function usesTip(stroke) {
  return Boolean(stroke.tip && stroke.tip !== 'round' && TIP_TOOLS.includes(stroke.tool));
}

// Stamps the tip along a stretch of the path, keeping the rhythm between segments.
function stampAlong(ctx, stroke, from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const distance = Math.hypot(dx, dy);
  if (!distance) return;
  const spacing = Math.max(2, stroke.width * 0.2);
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  let walked = Number(stroke.carry) || 0;
  while (walked + spacing <= distance) {
    walked += spacing;
    const t = walked / distance;
    stampTip(
      ctx,
      stroke.tip,
      stroke.color,
      from[0] + dx * t,
      from[1] + dy * t,
      stroke.width,
      angle
    );
  }
  stroke.carry = walked - distance;
}

export const PALETTE = [
  '#ffffff',
  '#e2e8f0',
  '#94a3b8',
  '#64748b',
  '#0f172a',
  '#f87171',
  '#fb7185',
  '#e879f9',
  '#c084fc',
  '#a78bfa',
  '#818cf8',
  '#60a5fa',
  '#38bdf8',
  '#2dd4bf',
  '#34d399',
  '#a3e635',
  '#fbbf24',
  '#fb923c',
  '#b45309',
  '#f5d0fe',
];

export const STAMPS = ['❤️', '💜', '💫', '⭐', '🌙', '🌸', '✨', '☁️', '🦋', '🐾', '🍀', '🎵'];

// Every place a single point lands when a mirror is on.
export function mirroredPoints([x, y], mode) {
  if (mode === 'v') return [[x, y], [CANVAS_WIDTH - x, y]];
  if (mode === 'h') return [[x, y], [x, CANVAS_HEIGHT - y]];
  if (mode === 'quad') {
    return [
      [x, y],
      [CANVAS_WIDTH - x, y],
      [x, CANVAS_HEIGHT - y],
      [CANVAS_WIDTH - x, CANVAS_HEIGHT - y],
    ];
  }
  return [[x, y]];
}

function begin(ctx, stroke) {
  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = Math.max(1, stroke.width);
  const flat = stroke.tool === 'roller';
  ctx.lineCap = flat ? 'butt' : 'round';
  ctx.lineJoin = flat ? 'bevel' : 'round';
  if (stroke.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
}

function spray(ctx, stroke, from, to) {
  const radius = Math.max(2, stroke.width / 2);
  const count = Math.max(6, Math.round(stroke.width * 1.1));
  ctx.globalAlpha = (stroke.opacity ?? 1) * 0.075;
  for (let i = 0; i < count; i += 1) {
    const t = Math.random();
    const cx = from[0] + (to[0] - from[0]) * t;
    const cy = from[1] + (to[1] - from[1]) * t;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * radius;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * dist,
      cy + Math.sin(angle) * dist,
      Math.max(0.6, radius * 0.13),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

const CHISEL = Math.PI / 4;

// A nib held at a fixed angle: thick across the nib, thin along it.
function chiselShape(ctx, stroke, from, to) {
  const half = Math.max(0.8, stroke.width) / 2;
  const nx = Math.cos(CHISEL) * half;
  const ny = Math.sin(CHISEL) * half;
  ctx.beginPath();
  if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 0.5) {
    ctx.ellipse(from[0], from[1], half, half * 0.3, CHISEL, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.moveTo(from[0] - nx, from[1] - ny);
  ctx.lineTo(to[0] - nx, to[1] - ny);
  ctx.lineTo(to[0] + nx, to[1] + ny);
  ctx.lineTo(from[0] + nx, from[1] + ny);
  ctx.closePath();
  ctx.fill();
}

// Dusty charcoal crumbs scattered along the stretch.
function grain(ctx, stroke, from, to) {
  const spread = Math.max(2, stroke.width * 0.6);
  const count = Math.max(8, Math.round(stroke.width * 0.9));
  ctx.globalAlpha = (stroke.opacity ?? 1) * 0.5;
  for (let i = 0; i < count; i += 1) {
    const t = Math.random();
    const cx = from[0] + (to[0] - from[0]) * t + (Math.random() - 0.5) * spread;
    const cy = from[1] + (to[1] - from[1]) * t + (Math.random() - 0.5) * spread;
    const size = Math.max(0.5, stroke.width * 0.12 * (0.4 + Math.random()));
    ctx.fillRect(cx, cy, size, size);
  }
}

// Soft overlapping blooms of pigment, the way a wet brush spreads.
function wash(ctx, stroke, from, to) {
  const radius = Math.max(2, stroke.width * 0.55);
  ctx.globalAlpha = (stroke.opacity ?? 1) * 0.09;
  for (let i = 0; i < 4; i += 1) {
    const t = Math.random();
    const cx = from[0] + (to[0] - from[0]) * t + (Math.random() - 0.5) * radius * 0.7;
    const cy = from[1] + (to[1] - from[1]) * t + (Math.random() - 0.5) * radius * 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (0.75 + Math.random() * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
}

// The colour of a rainbow stroke, stepped a little for every new stretch.
function rainbowColour(stroke) {
  stroke.hue = ((Number(stroke.hue) || 0) + 7) % 360;
  return `hsl(${Math.round(stroke.hue)} 88% 62%)`;
}

function glow(ctx, stroke) {
  ctx.shadowColor = stroke.color;
  ctx.shadowBlur = Math.max(8, stroke.width * 2);
}

function stampGlyph(ctx, stroke, point) {
  const size = Math.min(200, Math.max(18, stroke.width * 3));
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = stroke.color;
  ctx.fillText(stroke.emoji || '❤️', point[0], point[1]);
}

// Stamps a stencil outline (or a solid one) centred on a point.
export function paintStencil(ctx, stroke, point) {
  const { stencil, filled } = readStencilKey(stroke.emoji);
  const size = Math.max(60, Math.min(900, stroke.width || 280));
  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.translate(point[0], point[1]);
  drawStencilShape(ctx, stencil, {
    size,
    color: stroke.color,
    filled,
    strokeWidth: 3.4,
  });
  ctx.restore();
}

function hexToRgb(hex) {
  const clean = (hex || '').replace('#', '');
  const full =
    clean.length === 3
      ? clean.split('').map((part) => part + part).join('')
      : clean.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

// Pours colour into the area around a point, stopping at whatever lines are in the way.
export function fillRegion(ctx, point, color, opacity = 1) {
  const { width, height } = ctx.canvas;
  const seedX = Math.max(0, Math.min(width - 1, Math.round(point[0])));
  const seedY = Math.max(0, Math.min(height - 1, Math.round(point[1])));
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const start = (seedY * width + seedX) * 4;
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const [red, green, blue] = hexToRgb(color);
  const amount = Math.max(0.05, Math.min(1, opacity));

  const tolerance = 42;
  if (
    amount === 1 &&
    Math.abs(target[0] - red) <= tolerance &&
    Math.abs(target[1] - green) <= tolerance &&
    Math.abs(target[2] - blue) <= tolerance &&
    target[3] === 255
  ) {
    return;
  }

  const seen = new Uint8Array(width * height);
  const matches = (x, y) => {
    const index = y * width + x;
    if (seen[index]) return false;
    const i = index * 4;
    return (
      Math.abs(data[i] - target[0]) <= tolerance &&
      Math.abs(data[i + 1] - target[1]) <= tolerance &&
      Math.abs(data[i + 2] - target[2]) <= tolerance &&
      Math.abs(data[i + 3] - target[3]) <= tolerance
    );
  };
  const pour = (x, y) => {
    const index = y * width + x;
    seen[index] = 1;
    const i = index * 4;
    data[i] = Math.round(data[i] * (1 - amount) + red * amount);
    data[i + 1] = Math.round(data[i + 1] * (1 - amount) + green * amount);
    data[i + 2] = Math.round(data[i + 2] * (1 - amount) + blue * amount);
    data[i + 3] = Math.round(data[i + 3] * (1 - amount) + 255 * amount);
  };

  if (!matches(seedX, seedY)) return;

  const stack = [[seedX, seedY]];
  while (stack.length) {
    const [x, startY] = stack.pop();
    let y = startY;
    while (y >= 0 && matches(x, y)) y -= 1;
    y += 1;
    let spanLeft = false;
    let spanRight = false;
    while (y < height && matches(x, y)) {
      pour(x, y);
      if (x > 0) {
        const open = matches(x - 1, y);
        if (open && !spanLeft) {
          stack.push([x - 1, y]);
          spanLeft = true;
        } else if (!open) {
          spanLeft = false;
        }
      }
      if (x < width - 1) {
        const open = matches(x + 1, y);
        if (open && !spanRight) {
          stack.push([x + 1, y]);
          spanRight = true;
        } else if (!open) {
          spanRight = false;
        }
      }
      y += 1;
    }
  }

  ctx.putImageData(image, 0, 0);
}

export function paintDot(ctx, stroke, point) {
  begin(ctx, stroke);
  const [x, y] = point;
  if (usesTip(stroke)) {
    stroke.carry = 0;
    stampTip(ctx, stroke.tip, stroke.color, x, y, stroke.width, 0);
  } else if (stroke.tool === 'stamp') {
    stampGlyph(ctx, stroke, point);
  } else if (stroke.tool === 'airbrush') {
    spray(ctx, stroke, point, point);
  } else if (stroke.tool === 'pencil') {
    ctx.globalAlpha = (stroke.opacity ?? 1) * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, stroke.width / 2.6), 0, Math.PI * 2);
    ctx.fill();
  } else if (stroke.tool === 'marker') {
    ctx.globalAlpha = (stroke.opacity ?? 1) * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (stroke.tool === 'roller') {
    const half = stroke.width / 2;
    ctx.fillRect(x - half, y - half, stroke.width, stroke.width * 0.8);
  } else if (stroke.tool === 'calligraphy') {
    chiselShape(ctx, stroke, point, point);
  } else if (stroke.tool === 'charcoal') {
    ctx.globalAlpha = (stroke.opacity ?? 1) * 0.65;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.8, stroke.width / 2.4), 0, Math.PI * 2);
    ctx.fill();
    grain(ctx, stroke, point, point);
  } else if (stroke.tool === 'watercolor') {
    wash(ctx, stroke, point, point);
  } else if (stroke.tool === 'neon') {
    glow(ctx, stroke);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, stroke.width / 2), 0, Math.PI * 2);
    ctx.fill();
  } else if (stroke.tool === 'rainbow') {
    ctx.fillStyle = rainbowColour(stroke);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, stroke.width / 2), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawSegment(ctx, stroke, from, to) {
  if (stroke.tool === 'stamp') {
    paintDot(ctx, stroke, to);
    return;
  }
  begin(ctx, stroke);
  if (usesTip(stroke)) {
    stampAlong(ctx, stroke, from, to);
  } else if (stroke.tool === 'airbrush') {
    spray(ctx, stroke, from, to);
  } else if (stroke.tool === 'pencil') {
    ctx.globalAlpha = (stroke.opacity ?? 1) * 0.5;
    ctx.lineWidth = Math.max(0.8, stroke.width * 0.5);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    ctx.globalAlpha = (stroke.opacity ?? 1) * 0.25;
    for (let i = 0; i < 3; i += 1) {
      const t = Math.random();
      const jitter = stroke.width * 0.4;
      ctx.beginPath();
      ctx.arc(
        from[0] + (to[0] - from[0]) * t + (Math.random() - 0.5) * jitter,
        from[1] + (to[1] - from[1]) * t + (Math.random() - 0.5) * jitter,
        Math.max(0.4, stroke.width * 0.16),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else if (stroke.tool === 'marker') {
    ctx.globalAlpha = (stroke.opacity ?? 1) * 0.28;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  } else if (stroke.tool === 'calligraphy') {
    chiselShape(ctx, stroke, from, to);
  } else if (stroke.tool === 'charcoal') {
    ctx.globalAlpha = (stroke.opacity ?? 1) * 0.4;
    ctx.lineWidth = Math.max(1, stroke.width * 0.6);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    grain(ctx, stroke, from, to);
  } else if (stroke.tool === 'watercolor') {
    wash(ctx, stroke, from, to);
  } else if (stroke.tool === 'neon') {
    glow(ctx, stroke);
    ctx.lineWidth = Math.max(1.2, stroke.width * 0.45);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    ctx.shadowBlur = Math.max(4, stroke.width);
    ctx.lineWidth = Math.max(1, stroke.width * 0.22);
    ctx.stroke();
  } else if (stroke.tool === 'rainbow') {
    ctx.strokeStyle = rainbowColour(stroke);
    ctx.lineWidth = Math.max(1, stroke.width);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function paintShape(ctx, stroke, from, to) {
  begin(ctx, stroke);
  const [x1, y1] = from;
  const [x2, y2] = to;
  ctx.beginPath();
  if (stroke.tool === 'line') {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  } else if (stroke.tool === 'rect') {
    ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  } else {
    ctx.ellipse(
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      Math.abs(x2 - x1) / 2,
      Math.abs(y2 - y1) / 2,
      0,
      0,
      Math.PI * 2
    );
  }
  ctx.stroke();
  ctx.restore();
}

// Paints a whole stroke — used when a layer is replayed from its stored marks.
export function paintStroke(ctx, stroke) {
  const points = stroke.points || [];
  if (!points.length) return;
  if (stroke.tool === 'fill') {
    mirroredPoints(points[0], stroke.mirror).forEach((spot) =>
      fillRegion(ctx, spot, stroke.color, stroke.opacity)
    );
    return;
  }
  if (stroke.tool === 'stencil') {
    mirroredPoints(points[0], stroke.mirror).forEach((spot) => paintStencil(ctx, stroke, spot));
    return;
  }
  if (SHAPE_TOOLS.includes(stroke.tool)) {
    const first = mirroredPoints(points[0], stroke.mirror);
    const last = mirroredPoints(points[points.length - 1], stroke.mirror);
    first.forEach((start, index) => paintShape(ctx, stroke, start, last[index]));
    return;
  }
  const mapped = points.map((point) => mirroredPoints(point, stroke.mirror));
  const copies = mapped[0].length;
  for (let copy = 0; copy < copies; copy += 1) {
    const line = mapped.map((variants) => variants[copy]);
    paintDot(ctx, stroke, line[0]);
    for (let i = 1; i < line.length; i += 1) drawSegment(ctx, stroke, line[i - 1], line[i]);
  }
}

// Paints one new point of a live stroke (freehand tools).
export function paintLive(ctx, stroke, point, previous) {
  if (!previous) {
    mirroredPoints(point, stroke.mirror).forEach((spot) => paintDot(ctx, stroke, spot));
    return;
  }
  const from = mirroredPoints(previous, stroke.mirror);
  const to = mirroredPoints(point, stroke.mirror);
  from.forEach((start, index) => drawSegment(ctx, stroke, start, to[index]));
}

// Paints the rubber-band preview of a shape tool.
export function paintPreview(ctx, stroke) {
  const points = stroke.points || [];
  if (!points.length) return;
  const first = mirroredPoints(points[0], stroke.mirror);
  const last = mirroredPoints(points[points.length - 1], stroke.mirror);
  first.forEach((start, index) => paintShape(ctx, stroke, start, last[index]));
}