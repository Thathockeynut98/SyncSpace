// Small drawing helpers shared by the colouring-page shapes.
// Every shape is drawn inside a 100 x 100 box centred on (0, 0).

export const TAU = Math.PI * 2;

export function circlePath(ctx, cx, cy, r) {
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.closePath();
}

export function ellipsePath(ctx, cx, cy, rx, ry, rotation = 0) {
  ctx.moveTo(cx + rx * Math.cos(rotation), cy + rx * Math.sin(rotation));
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, TAU);
  ctx.closePath();
}

export function polyPath(ctx, points) {
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

export function linePath(ctx, x1, y1, x2, y2) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

export function petalRing(ctx, count, distance, rx, ry, start = -Math.PI / 2) {
  for (let index = 0; index < count; index += 1) {
    const angle = start + (index / count) * TAU;
    ellipsePath(
      ctx,
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      rx,
      ry,
      angle + Math.PI / 2
    );
  }
}

export function starPoly(ctx, spikes, outer, inner, offset = -Math.PI / 2) {
  const points = [];
  for (let index = 0; index < spikes * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = offset + (index * Math.PI) / spikes;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  polyPath(ctx, points);
}

// A ring that swells in and out, for petals, clouds and soft blobs.
export function wobbleRing(ctx, radius, bumps, amount, steps = 160) {
  const points = [];
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * TAU;
    const r = radius + Math.cos(angle * bumps) * amount;
    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  polyPath(ctx, points);
}

export function sparklePath(ctx, x, y, size) {
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.3, y - size * 0.3, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.3, y + size * 0.3, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.3, y + size * 0.3, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.3, y - size * 0.3, x, y - size);
  ctx.closePath();
}

// One leaf, centred on (cx, cy) and pointing along `angle`.
export function leafPath(ctx, cx, cy, length, width, angle = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = cx + (cos * length) / 2;
  const tipY = cy + (sin * length) / 2;
  const backX = cx - (cos * length) / 2;
  const backY = cy - (sin * length) / 2;
  const nx = -sin * width;
  const ny = cos * width;
  ctx.moveTo(backX, backY);
  ctx.quadraticCurveTo(cx + nx, cy + ny, tipX, tipY);
  ctx.quadraticCurveTo(cx - nx, cy - ny, backX, backY);
  ctx.closePath();
}