// The stencil library: outlined shapes you can trace, stack and colour in.
// Every shape is drawn inside a 100 x 100 box centred on (0, 0), so the same
// drawing serves the tiny previews and the full page canvas.

import { COLORING_GROUPS } from './coloring';

const TAU = Math.PI * 2;

function circlePath(ctx, cx, cy, r) {
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.closePath();
}

function ellipsePath(ctx, cx, cy, rx, ry, rotation = 0) {
  ctx.moveTo(cx + rx * Math.cos(rotation), cy + rx * Math.sin(rotation));
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, TAU);
  ctx.closePath();
}

function polyPath(ctx, points) {
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function radialPoints(count, radius, offset = -Math.PI / 2) {
  return Array.from({ length: count }, (_, index) => {
    const angle = offset + (index / count) * TAU;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
}

function starPoints(spikes, outer, inner, offset = -Math.PI / 2) {
  const points = [];
  for (let index = 0; index < spikes * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = offset + (index * Math.PI) / spikes;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points;
}

function turn(x, y, angle) {
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
}

function ringOfPetals(ctx, count, distance, rx, ry, start = -Math.PI / 2) {
  for (let index = 0; index < count; index += 1) {
    const angle = start + (index / count) * TAU;
    ellipsePath(ctx, Math.cos(angle) * distance, Math.sin(angle) * distance, rx, ry, angle + Math.PI / 2);
  }
}

function heartPath(ctx, scale = 1, drop = 0) {
  const x = (value) => value * scale;
  const y = (value) => value * scale + drop;
  ctx.moveTo(x(0), y(42));
  ctx.bezierCurveTo(x(-52), y(6), x(-42), y(-44), x(-13), y(-40));
  ctx.bezierCurveTo(x(-5), y(-38), x(-1), y(-32), x(0), y(-24));
  ctx.bezierCurveTo(x(1), y(-32), x(5), y(-38), x(13), y(-40));
  ctx.bezierCurveTo(x(42), y(-44), x(52), y(6), x(0), y(42));
  ctx.closePath();
}

function bloom(ctx, count, length, spread, inner = 10) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU;
    const tip = turn(0, -length, angle);
    const up1 = turn(spread, -length * 0.42, angle);
    const up2 = turn(spread * 0.32, -length * 0.92, angle);
    const up3 = turn(-spread * 0.32, -length * 0.92, angle);
    const up4 = turn(-spread, -length * 0.42, angle);
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(up1[0], up1[1], up2[0], up2[1], tip[0], tip[1]);
    ctx.bezierCurveTo(up3[0], up3[1], up4[0], up4[1], 0, 0);
    ctx.closePath();
  }
  circlePath(ctx, 0, 0, inner);
}

// ---- basics --------------------------------------------------------------

function lineBar(ctx) {
  polyPath(ctx, [
    [-46, -4],
    [46, -4],
    [46, 4],
    [-46, 4],
  ]);
}

function box(ctx) {
  polyPath(ctx, [
    [-40, -40],
    [40, -40],
    [40, 40],
    [-40, 40],
  ]);
}

function circle(ctx) {
  circlePath(ctx, 0, 0, 44);
}

// ---- flowers -------------------------------------------------------------

function daisy(ctx) {
  ringOfPetals(ctx, 10, 27, 8, 20);
  circlePath(ctx, 0, 0, 10);
  circlePath(ctx, 0, 0, 5);
}

function poppy(ctx) {
  ringOfPetals(ctx, 5, 25, 17, 21);
  circlePath(ctx, 0, 0, 9);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * TAU;
    circlePath(ctx, Math.cos(angle) * 4.5, Math.sin(angle) * 4.5, 1.9);
  }
}

function sunflower(ctx) {
  ringOfPetals(ctx, 18, 33, 5, 14);
  ringOfPetals(ctx, 12, 21, 4.5, 10, -Math.PI / 2 + 0.26);
  circlePath(ctx, 0, 0, 12);
  circlePath(ctx, 0, 0, 6);
}

function rose(ctx) {
  for (let ring = 0; ring < 3; ring += 1) {
    const base = 45 - ring * 13;
    const lobes = 8 + ring * 2;
    const points = [];
    for (let step = 0; step < 108; step += 1) {
      const angle = (step / 108) * TAU;
      const radius = base + Math.cos(angle * lobes) * (ring === 0 ? 3.4 : 2.6);
      points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
    polyPath(ctx, points);
  }
  circlePath(ctx, 0, 0, 6);
}

function tulip(ctx) {
  ctx.moveTo(-27, -8);
  ctx.bezierCurveTo(-31, -36, -11, -47, -8, -25);
  ctx.bezierCurveTo(-4, -43, 4, -43, 8, -25);
  ctx.bezierCurveTo(11, -47, 31, -36, 27, -8);
  ctx.bezierCurveTo(18, 13, -18, 13, -27, -8);
  ctx.closePath();
  ctx.moveTo(0, 6);
  ctx.lineTo(0, 45);
  ctx.moveTo(0, 20);
  ctx.bezierCurveTo(-17, 14, -30, 25, -25, 41);
  ctx.bezierCurveTo(-12, 39, -3, 32, 0, 20);
  ctx.closePath();
  ctx.moveTo(0, 30);
  ctx.bezierCurveTo(17, 24, 30, 34, 25, 45);
  ctx.bezierCurveTo(12, 44, 3, 39, 0, 30);
  ctx.closePath();
}

// ---- stars ---------------------------------------------------------------

function starFive(ctx) {
  polyPath(ctx, starPoints(5, 47, 19));
}

function starSix(ctx) {
  polyPath(ctx, starPoints(6, 46, 26));
  circlePath(ctx, 0, 0, 7);
}

function sparkle(ctx) {
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(7, -18, 18, -7, 48, 0);
  ctx.bezierCurveTo(18, 7, 7, 18, 0, 48);
  ctx.bezierCurveTo(-7, 18, -18, 7, -48, 0);
  ctx.bezierCurveTo(-18, -7, -7, -18, 0, -48);
  ctx.closePath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(3, -7, 7, -3, 18, 0);
  ctx.bezierCurveTo(7, 3, 3, 7, 0, 18);
  ctx.bezierCurveTo(-3, 7, -7, 3, -18, 0);
  ctx.bezierCurveTo(-7, -3, -3, -7, 0, -18);
  ctx.closePath();
}

function sun(ctx) {
  circlePath(ctx, 0, 0, 15);
  circlePath(ctx, 0, 0, 8);
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * TAU;
    const spread = 0.055;
    polyPath(ctx, [
      [Math.cos(angle - spread) * 20, Math.sin(angle - spread) * 20],
      [Math.cos(angle) * 47, Math.sin(angle) * 47],
      [Math.cos(angle + spread) * 20, Math.sin(angle + spread) * 20],
    ]);
  }
}

function snowflake(ctx) {
  polyPath(ctx, radialPoints(6, 13));
  circlePath(ctx, 0, 0, 4);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * TAU;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const px = -uy;
    const py = ux;
    ctx.moveTo(ux * 13, uy * 13);
    ctx.lineTo(ux * 47, uy * 47);
    const cx = ux * 34;
    const cy = uy * 34;
    polyPath(ctx, [
      [cx - px * 4, cy - py * 4],
      [cx + ux * 8, cy + uy * 8],
      [cx + px * 4, cy + py * 4],
      [cx - ux * 8, cy - uy * 8],
    ]);
    const bx = ux * 22;
    const by = uy * 22;
    [-1, 1].forEach((side) => {
      const sx = ux * 11 + px * 9 * side;
      const sy = uy * 11 + py * 9 * side;
      polyPath(ctx, [
        [bx - px * 2.4, by - py * 2.4],
        [bx + sx, by + sy],
        [bx + px * 2.4, by + py * 2.4],
      ]);
    });
  }
}

// ---- hearts --------------------------------------------------------------

function heart(ctx) {
  heartPath(ctx, 1);
}

function heartDouble(ctx) {
  heartPath(ctx, 1);
  heartPath(ctx, 0.55, -2);
}

function heartSparkle(ctx) {
  heartPath(ctx, 0.86, 3);
  [
    [-30, -34, 11],
    [30, -30, 8],
    [36, 22, 6],
  ].forEach(([cx, cy, size]) => {
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size * 0.35, cy - size * 0.3, cx + size, cy);
    ctx.quadraticCurveTo(cx + size * 0.35, cy + size * 0.3, cx, cy + size);
    ctx.quadraticCurveTo(cx - size * 0.35, cy + size * 0.3, cx - size, cy);
    ctx.quadraticCurveTo(cx - size * 0.35, cy - size * 0.3, cx, cy - size);
    ctx.closePath();
  });
}

// ---- geometric -----------------------------------------------------------

function hexes(ctx) {
  polyPath(ctx, radialPoints(6, 47));
  polyPath(ctx, radialPoints(6, 33));
  polyPath(ctx, radialPoints(6, 19));
  circlePath(ctx, 0, 0, 7);
}

function triangles(ctx) {
  for (let ring = 0; ring < 3; ring += 1) {
    polyPath(ctx, radialPoints(3, 47 - ring * 13, -Math.PI / 2 + (ring * Math.PI) / 6));
  }
}

function diamonds(ctx) {
  const step = 21;
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const cx = column * step - 31.5;
      const cy = row * step - 31.5;
      polyPath(ctx, [
        [cx, cy - 10],
        [cx + 10, cy],
        [cx, cy + 10],
        [cx - 10, cy],
      ]);
    }
  }
}

function rings(ctx) {
  [46, 35, 24, 13, 4.5].forEach((radius) => circlePath(ctx, 0, 0, radius));
}

function cube(ctx) {
  const hex = radialPoints(6, 45);
  polyPath(ctx, hex);
  [hex[0], hex[2], hex[4]].forEach(([x, y]) => {
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
  });
}

function fan(ctx) {
  ctx.moveTo(46, 14);
  ctx.arc(0, 14, 46, 0, Math.PI);
  ctx.closePath();
  for (let index = 1; index < 9; index += 1) {
    const angle = (Math.PI * index) / 9;
    ctx.moveTo(0, 14);
    ctx.lineTo(Math.cos(angle) * 46, 14 + Math.sin(angle) * 46);
  }
  circlePath(ctx, 0, 14, 6);
}

// ---- abstract ------------------------------------------------------------

function blob(ctx) {
  const shape = (scale) => {
    ctx.moveTo(0, -44 * scale);
    ctx.bezierCurveTo(28 * scale, -46 * scale, 48 * scale, -22 * scale, 40 * scale, 2 * scale);
    ctx.bezierCurveTo(34 * scale, 24 * scale, 22 * scale, 44 * scale, -2 * scale, 42 * scale);
    ctx.bezierCurveTo(-26 * scale, 40 * scale, -46 * scale, 22 * scale, -42 * scale, -4 * scale);
    ctx.bezierCurveTo(-38 * scale, -28 * scale, -24 * scale, -42 * scale, 0 * scale, -44 * scale);
    ctx.closePath();
  };
  shape(1);
  shape(0.58);
}

function mandala(ctx) {
  bloom(ctx, 12, 46, 11, 9);
  circlePath(ctx, 0, 0, 22);
  bloom(ctx, 8, 24, 6, 4);
}

function orbit(ctx) {
  for (let index = 0; index < 3; index += 1) {
    const angle = -Math.PI / 2 + (index / 3) * TAU;
    circlePath(ctx, Math.cos(angle) * 16, Math.sin(angle) * 16, 28);
  }
  circlePath(ctx, 0, 0, 7);
}

function spiral(ctx) {
  let first = true;
  for (let step = 0; step <= 240; step += 1) {
    const t = step / 240;
    const angle = t * TAU * 3.1;
    const radius = 3 + t * 43;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  circlePath(ctx, 0, 0, 47);
}

function infinity(ctx) {
  const loop = (scale) => {
    let first = true;
    for (let step = 0; step < 128; step += 1) {
      const t = (step / 128) * TAU;
      const denominator = 1 + Math.sin(t) * Math.sin(t);
      const x = (44 * Math.cos(t)) / denominator;
      const y = (44 * Math.sin(t) * Math.cos(t)) / denominator;
      if (first) {
        ctx.moveTo(x * scale, y * scale);
        first = false;
      } else {
        ctx.lineTo(x * scale, y * scale);
      }
    }
    ctx.closePath();
  };
  loop(1);
  loop(0.55);
}

function waves(ctx) {
  for (let row = 0; row < 4; row += 1) {
    const base = -36 + row * 24;
    ctx.moveTo(-46, base);
    for (let x = -46; x <= 46; x += 3) {
      ctx.lineTo(x, base + Math.sin((x / 46) * TAU) * 7);
    }
  }
}

// ---- the library ---------------------------------------------------------

const BASE_GROUPS = [
  {
    id: 'basics',
    label: 'Basics',
    items: [
      { id: 'line', label: 'Line', draw: lineBar },
      { id: 'box', label: 'Box', draw: box },
      { id: 'circle', label: 'Circle', draw: circle },
    ],
  },
  {
    id: 'flowers',
    label: 'Flowers',
    items: [
      { id: 'daisy', label: 'Daisy', draw: daisy },
      { id: 'poppy', label: 'Poppy', draw: poppy },
      { id: 'sunflower', label: 'Sunflower', draw: sunflower },
      { id: 'rose', label: 'Rose', draw: rose },
      { id: 'tulip', label: 'Tulip', draw: tulip },
    ],
  },
  {
    id: 'stars',
    label: 'Stars',
    items: [
      { id: 'star-five', label: 'Five point star', draw: starFive },
      { id: 'star-six', label: 'Six point star', draw: starSix },
      { id: 'sparkle', label: 'Sparkle', draw: sparkle },
      { id: 'sun', label: 'Sunburst', draw: sun },
      { id: 'snowflake', label: 'Snowflake', draw: snowflake },
    ],
  },
  {
    id: 'hearts',
    label: 'Hearts',
    items: [
      { id: 'heart', label: 'Heart', draw: heart },
      { id: 'heart-double', label: 'Double heart', draw: heartDouble },
      { id: 'heart-sparkle', label: 'Heart with sparkles', draw: heartSparkle },
    ],
  },
  {
    id: 'geometric',
    label: 'Geometric',
    items: [
      { id: 'hexes', label: 'Nested hexagons', draw: hexes },
      { id: 'triangles', label: 'Triangle stack', draw: triangles },
      { id: 'diamonds', label: 'Diamond lattice', draw: diamonds },
      { id: 'rings', label: 'Concentric rings', draw: rings },
      { id: 'cube', label: 'Wire cube', draw: cube },
      { id: 'fan', label: 'Fan', draw: fan },
    ],
  },
  {
    id: 'abstract',
    label: 'Abstract',
    items: [
      { id: 'blob', label: 'Soft blob', draw: blob },
      { id: 'mandala', label: 'Mandala bloom', draw: mandala },
      { id: 'orbit', label: 'Orbit', draw: orbit },
      { id: 'spiral', label: 'Spiral', draw: spiral },
      { id: 'infinity', label: 'Infinity loop', draw: infinity },
      { id: 'waves', label: 'Wavelengths', draw: waves },
    ],
  },
];

export const STENCIL_GROUPS = [...BASE_GROUPS, ...COLORING_GROUPS];

export const STENCILS = STENCIL_GROUPS.flatMap((group) => group.items);

export function findStencil(id) {
  return STENCILS.find((stencil) => stencil.id === id) || STENCILS[0];
}

export function stencilKey(id, filled) {
  return filled ? `${id}#f` : id;
}

export function readStencilKey(value) {
  const [id, flag] = String(value || '').split('#');
  return { stencil: findStencil(id), filled: flag === 'f' };
}

// Draws one stencil with its origin at the current (0, 0).
export function drawStencilShape(ctx, stencil, { size, color, filled = false, strokeWidth = 3 }) {
  if (!stencil) return;
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.beginPath();
  stencil.draw(ctx);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = (strokeWidth * 100) / size;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (filled) ctx.fill('evenodd');
  ctx.stroke();
  ctx.restore();
}