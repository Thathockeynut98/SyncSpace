// Colouring pages: garden things, space and mandalas.
import {
  circlePath,
  ellipsePath,
  leafPath,
  linePath,
  petalRing,
  polyPath,
  sparklePath,
  starPoly,
  TAU,
  wobbleRing,
} from './draw';

function tree(ctx) {
  wobbleRing(ctx, 34, 9, 4);
  linePath(ctx, 0, 26, 0, 46);
  linePath(ctx, -12, 34, 0, 44);
  linePath(ctx, 12, 34, 0, 44);
  [0, 120, 240].forEach((degree) => {
    const angle = (degree / 180) * Math.PI;
    linePath(ctx, 0, 40, Math.cos(angle) * 34, 40 + Math.sin(angle) * 30);
  });
}

function leaf(ctx) {
  leafPath(ctx, 0, 0, 88, 26, -Math.PI / 2);
  linePath(ctx, 0, -40, 0, 40);
  [-24, -12, 0, 12, 24].forEach((y) => {
    linePath(ctx, 0, y, -20 + Math.abs(y) * 0.2, y - 12);
    linePath(ctx, 0, y, 20 - Math.abs(y) * 0.2, y - 12);
  });
}

function mushroom(ctx) {
  ctx.moveTo(-40, 6);
  ctx.bezierCurveTo(-40, -34, 40, -34, 40, 6);
  ctx.closePath();
  polyPath(ctx, [
    [-14, 6],
    [-13, 38],
    [13, 38],
    [14, 6],
  ]);
  [
    [-16, -8, 5],
    [10, -14, 4],
    [22, -2, 3],
  ].forEach(([x, y, r]) => circlePath(ctx, x, y, r));
}

function cactus(ctx) {
  polyPath(ctx, [
    [-13, 28],
    [-13, -14],
    [-4, -30],
    [6, -30],
    [13, -14],
    [13, 28],
  ]);
  polyPath(ctx, [
    [-13, 6],
    [-30, 6],
    [-32, -2],
    [-32, -16],
    [-24, -16],
    [-22, -4],
    [-13, -2],
  ]);
  polyPath(ctx, [
    [13, -4],
    [26, -4],
    [28, -10],
    [28, -26],
    [20, -26],
    [18, -12],
    [13, -10],
  ]);
  polyPath(ctx, [
    [-20, 28],
    [-20, 44],
    [20, 44],
    [20, 28],
  ]);
  linePath(ctx, 0, -22, 0, 18);
}

function bouquet(ctx) {
  [
    [-26, -12, 12],
    [0, -24, 14],
    [26, -12, 12],
  ].forEach(([x, y, size]) => {
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + (index / 6) * TAU;
      ellipsePath(
        ctx,
        x + Math.cos(angle) * size * 0.6,
        y + Math.sin(angle) * size * 0.6,
        size * 0.34,
        size * 0.52,
        angle + Math.PI / 2
      );
    }
    circlePath(ctx, x, y, size * 0.3);
  });
  linePath(ctx, -26, -6, 0, 40);
  linePath(ctx, 0, -14, 0, 40);
  linePath(ctx, 26, -6, 0, 40);
  leafPath(ctx, -18, 20, 24, 7, -0.9);
  leafPath(ctx, 18, 26, 24, 7, 0.9);
  polyPath(ctx, [
    [-14, 30],
    [0, 44],
    [14, 30],
    [10, 38],
    [0, 34],
    [-10, 38],
  ]);
}

function cloud(ctx) {
  ctx.moveTo(-40, 20);
  ctx.bezierCurveTo(-46, 2, -30, -6, -20, 0);
  ctx.bezierCurveTo(-18, -20, 8, -26, 14, -8);
  ctx.bezierCurveTo(30, -16, 44, -4, 38, 10);
  ctx.bezierCurveTo(46, 20, 34, 30, 22, 26);
  ctx.lineTo(-28, 28);
  ctx.closePath();
}

function moon(ctx) {
  ctx.moveTo(14, -42);
  ctx.bezierCurveTo(-18, -34, -22, 24, 14, 42);
  ctx.bezierCurveTo(-24, 34, -34, -24, 14, -42);
  ctx.closePath();
  [
    [-26, -22, 6],
    [22, -20, 4],
    [28, 18, 5],
  ].forEach(([x, y, size]) => sparklePath(ctx, x, y, size));
}

function rainbow(ctx) {
  [42, 32, 22, 12].forEach((radius) => {
    ctx.moveTo(radius, 24);
    ctx.arc(0, 24, radius, 0, Math.PI, true);
  });
  [
    [-38, 18],
    [38, 18],
  ].forEach(([x, y]) => {
    ctx.moveTo(x - 16, y + 8);
    ctx.bezierCurveTo(x - 20, y - 4, x - 6, y - 10, x, y - 2);
    ctx.bezierCurveTo(x + 6, y - 12, x + 22, y - 4, x + 16, y + 8);
    ctx.closePath();
  });
}

function planet(ctx) {
  circlePath(ctx, 0, 0, 26);
  ellipsePath(ctx, 0, 0, 44, 12, -0.35);
  circlePath(ctx, -9, -6, 6);
  circlePath(ctx, 8, 8, 4.5);
  circlePath(ctx, 4, -14, 3);
}

function rocket(ctx) {
  ctx.moveTo(0, -46);
  ctx.bezierCurveTo(16, -30, 18, -6, 14, 18);
  ctx.lineTo(-14, 18);
  ctx.bezierCurveTo(-18, -6, -16, -30, 0, -46);
  ctx.closePath();
  polyPath(ctx, [
    [-14, 0],
    [-30, 16],
    [-16, 20],
  ]);
  polyPath(ctx, [
    [14, 0],
    [30, 16],
    [16, 20],
  ]);
  circlePath(ctx, 0, -16, 8);
  polyPath(ctx, [
    [-10, 20],
    [0, 44],
    [10, 20],
  ]);
  polyPath(ctx, [
    [-5, 20],
    [0, 32],
    [5, 20],
  ]);
}

function comet(ctx) {
  circlePath(ctx, 16, -18, 17);
  [
    [-42, 18],
    [-30, 26],
    [-20, 34],
  ].forEach(([x, y], index) => {
    linePath(ctx, 0, -8 + index * 4, x, y);
    linePath(ctx, 4, -2 + index * 6, x + 12, y + 6);
  });
  sparklePath(ctx, -30, -26, 5);
  sparklePath(ctx, 34, 30, 4);
}

function ufo(ctx) {
  ctx.moveTo(-20, -8);
  ctx.bezierCurveTo(-20, -30, 20, -30, 20, -8);
  ctx.closePath();
  ellipsePath(ctx, 0, -4, 42, 16);
  [-26, -9, 9, 26].forEach((x) => circlePath(ctx, x, -2, 3.4));
  linePath(ctx, -20, 12, -34, 34);
  linePath(ctx, 0, 12, 0, 38);
  linePath(ctx, 20, 12, 34, 34);
}

function constellation(ctx) {
  const stars = [
    [-34, -26],
    [-8, -38],
    [16, -22],
    [30, 0],
    [12, 22],
    [-12, 30],
    [-30, 8],
  ];
  stars.forEach(([x, y]) => {
    circlePath(ctx, x, y, 3.2);
  });
  for (let index = 0; index < stars.length - 1; index += 1) {
    linePath(ctx, stars[index][0], stars[index][1], stars[index + 1][0], stars[index + 1][1]);
  }
  linePath(ctx, stars[6][0], stars[6][1], stars[0][0], stars[0][1]);
  sparklePath(ctx, 34, -34, 8);
}

function mandalaSun(ctx) {
  petalRing(ctx, 16, 30, 6, 15);
  circlePath(ctx, 0, 0, 19);
  starPoly(ctx, 8, 14, 6);
  circlePath(ctx, 0, 0, 4);
}

function mandalaLotus(ctx) {
  petalRing(ctx, 12, 32, 7, 14);
  petalRing(ctx, 8, 18, 6, 17, -Math.PI / 2 + 0.39);
  circlePath(ctx, 0, 0, 11);
  starPoly(ctx, 6, 9, 4);
}

function mandalaWheel(ctx) {
  circlePath(ctx, 0, 0, 45);
  circlePath(ctx, 0, 0, 33);
  circlePath(ctx, 0, 0, 13);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * TAU;
    linePath(ctx, Math.cos(angle) * 13, Math.sin(angle) * 13, Math.cos(angle) * 45, Math.sin(angle) * 45);
    circlePath(ctx, Math.cos(angle) * 23, Math.sin(angle) * 23, 3.4);
  }
}

function mandalaScallop(ctx) {
  circlePath(ctx, 0, 0, 44);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * TAU;
    ctx.moveTo(Math.cos(angle - 0.26) * 44, Math.sin(angle - 0.26) * 44);
    ctx.arc(0, 0, 30, angle - 0.26, angle + 0.26);
  }
  petalRing(ctx, 8, 18, 5, 11);
  circlePath(ctx, 0, 0, 7);
}

function mandalaDiamond(ctx) {
  polyPath(ctx, [
    [0, -44],
    [44, 0],
    [0, 44],
    [-44, 0],
  ]);
  [
    [0, -28],
    [28, 0],
    [0, 28],
    [-28, 0],
  ].forEach(([x, y]) => circlePath(ctx, x, y, 8));
  circlePath(ctx, 0, 0, 14);
  starPoly(ctx, 4, 26, 9, 0);
}

function mandalaBloom(ctx) {
  wobbleRing(ctx, 40, 10, 5);
  petalRing(ctx, 10, 24, 6, 13);
  circlePath(ctx, 0, 0, 16);
  sparklePath(ctx, 0, 0, 9);
}

function mandalaStar(ctx) {
  starPoly(ctx, 12, 45, 20);
  starPoly(ctx, 12, 30, 26, 0);
  circlePath(ctx, 0, 0, 12);
  circlePath(ctx, 0, 0, 5);
}

function tulip(ctx) {
  ctx.moveTo(-16, -10);
  ctx.bezierCurveTo(-21, -38, 21, -38, 16, -10);
  ctx.quadraticCurveTo(0, -3, -16, -10);
  ctx.closePath();
  ctx.moveTo(-8, -9);
  ctx.bezierCurveTo(-12, -25, -8, -33, 0, -36);
  ctx.moveTo(8, -9);
  ctx.bezierCurveTo(12, -25, 8, -33, 0, -36);
  linePath(ctx, 0, -5, 0, 42);
  leafPath(ctx, -13, 16, 30, 8, -0.95);
  leafPath(ctx, 13, 28, 30, 8, 0.95);
}

function sunflower(ctx) {
  petalRing(ctx, 14, 26, 9, 15);
  circlePath(ctx, 0, 0, 17);
  for (let y = -9; y <= 9; y += 6) {
    for (let x = -9; x <= 9; x += 6) {
      if (x * x + y * y < 64) circlePath(ctx, x, y, 2.4);
    }
  }
  linePath(ctx, 0, 17, 0, 46);
  leafPath(ctx, -14, 26, 26, 7, -0.8);
  leafPath(ctx, 13, 37, 24, 6.5, 0.8);
}

function daisy(ctx) {
  petalRing(ctx, 11, 22, 8, 17);
  circlePath(ctx, 0, 0, 12);
  [
    [-4, -3],
    [4, -3],
    [0, 4],
  ].forEach(([x, y]) => circlePath(ctx, x, y, 2));
  linePath(ctx, 0, 12, 0, 46);
  leafPath(ctx, -12, 28, 26, 7, -0.85);
  leafPath(ctx, 12, 38, 22, 6, 0.85);
}

function pottedPlant(ctx) {
  linePath(ctx, 0, 10, 0, -20);
  leafPath(ctx, 0, -25, 26, 8, -Math.PI / 2);
  leafPath(ctx, -13, -18, 26, 8, -1.15);
  leafPath(ctx, 13, -15, 26, 8, 1.15);
  polyPath(ctx, [
    [-19, 8],
    [19, 8],
    [19, 17],
    [-19, 17],
  ]);
  polyPath(ctx, [
    [-17, 17],
    [17, 17],
    [12, 44],
    [-12, 44],
  ]);
}

function seedling(ctx) {
  ctx.moveTo(-27, 34);
  ctx.bezierCurveTo(-16, 24, 16, 24, 27, 34);
  ctx.bezierCurveTo(16, 39, -16, 39, -27, 34);
  ctx.closePath();
  linePath(ctx, 0, 29, 0, -6);
  leafPath(ctx, -13, -10, 30, 9, -Math.PI / 2 - 0.6);
  leafPath(ctx, 13, -16, 28, 8, -Math.PI / 2 + 0.6);
  linePath(ctx, -3, -6, -20, -20);
  linePath(ctx, 3, -12, 20, -24);
}

function wateringCan(ctx) {
  ctx.moveTo(-26, -12);
  ctx.lineTo(18, -12);
  ctx.bezierCurveTo(22, 8, 15, 26, 6, 34);
  ctx.lineTo(-18, 34);
  ctx.bezierCurveTo(-27, 22, -30, 4, -26, -12);
  ctx.closePath();
  polyPath(ctx, [
    [18, -6],
    [40, -26],
    [46, -18],
    [26, 4],
  ]);
  ellipsePath(ctx, 45, -25, 7, 4, -0.7);
  ctx.moveTo(-24, -12);
  ctx.bezierCurveTo(-16, -34, 8, -36, 16, -16);
  linePath(ctx, -24, -12, -14, -12);
  linePath(ctx, 8, -12, 18, -12);
  [
    [38, -34, 2.6],
    [45, -36, 2],
    [51, -32, 2.4],
  ].forEach(([x, y, size]) => circlePath(ctx, x, y, size));
}

function helmet(ctx) {
  circlePath(ctx, 0, 0, 40);
  ellipsePath(ctx, 0, -2, 26, 22);
  ctx.moveTo(-15, -14);
  ctx.quadraticCurveTo(-6, -23, 6, -21);
  polyPath(ctx, [
    [-24, 30],
    [24, 30],
    [18, 42],
    [-18, 42],
  ]);
}

function telescope(ctx) {
  polyPath(ctx, [
    [-30, 23],
    [20, -17],
    [12, -27],
    [-38, 13],
  ]);
  ellipsePath(ctx, 18, -24, 9, 7, -0.68);
  polyPath(ctx, [
    [-38, 13],
    [-30, 23],
    [-42, 20],
  ]);
  linePath(ctx, -8, 6, -20, 44);
  linePath(ctx, -8, 6, 4, 44);
  linePath(ctx, -8, 6, -6, 44);
  circlePath(ctx, -8, 4, 5);
  sparklePath(ctx, 34, -34, 6);
  sparklePath(ctx, -32, -32, 5);
}

function satellite(ctx) {
  polyPath(ctx, [
    [-14, -14],
    [14, -14],
    [14, 14],
    [-14, 14],
  ]);
  polyPath(ctx, [
    [-40, -6],
    [-16, -6],
    [-16, 6],
    [-40, 6],
  ]);
  polyPath(ctx, [
    [16, -6],
    [40, -6],
    [40, 6],
    [16, 6],
  ]);
  [-30, -23].forEach((x) => linePath(ctx, x, -6, x, 6));
  [23, 30].forEach((x) => linePath(ctx, x, -6, x, 6));
  ellipsePath(ctx, 4, -22, 9, 5, -0.35);
  linePath(ctx, 0, -16, 0, -14);
  linePath(ctx, -6, 14, -12, 26);
  linePath(ctx, 6, 14, 12, 26);
}

function galaxy(ctx) {
  for (let arm = 0; arm < 3; arm += 1) {
    let first = true;
    for (let step = 0; step <= 60; step += 1) {
      const t = step / 60;
      const angle = (arm / 3) * TAU + t * TAU * 0.9;
      const radius = 3 + t * 38;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
  }
  circlePath(ctx, 0, 0, 6);
  [
    [-30, 28],
    [26, -30],
    [-36, -14],
    [34, 20],
  ].forEach(([x, y]) => sparklePath(ctx, x, y, 4.5));
}

function mandalaHeart(ctx) {
  ctx.moveTo(0, 40);
  ctx.bezierCurveTo(-46, 8, -40, -30, -16, -30);
  ctx.bezierCurveTo(-6, -30, 0, -22, 0, -14);
  ctx.bezierCurveTo(0, -22, 6, -30, 16, -30);
  ctx.bezierCurveTo(40, -30, 46, 8, 0, 40);
  ctx.closePath();
  ctx.moveTo(0, 29);
  ctx.bezierCurveTo(-33, 4, -29, -21, -12, -21);
  ctx.bezierCurveTo(-5, -21, 0, -15, 0, -9);
  ctx.bezierCurveTo(0, -15, 5, -21, 12, -21);
  ctx.bezierCurveTo(29, -21, 33, 4, 0, 29);
  ctx.closePath();
  circlePath(ctx, 0, -12, 5);
  petalRing(ctx, 6, 14, 4, 7);
}

function mandalaSnowflake(ctx) {
  circlePath(ctx, 0, 0, 44);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * TAU;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    linePath(ctx, 0, 0, cos * 44, sin * 44);
    [17, 29].forEach((distance, step) => {
      const bx = cos * distance;
      const by = sin * distance;
      const length = 11 - step * 4;
      linePath(ctx, bx, by, bx + Math.cos(angle + 0.9) * length, by + Math.sin(angle + 0.9) * length);
      linePath(ctx, bx, by, bx + Math.cos(angle - 0.9) * length, by + Math.sin(angle - 0.9) * length);
    });
    circlePath(ctx, cos * 38, sin * 38, 2.8);
  }
  circlePath(ctx, 0, 0, 10);
}

function mandalaSpiral(ctx) {
  circlePath(ctx, 0, 0, 44);
  circlePath(ctx, 0, 0, 34);
  let first = true;
  for (let step = 0; step <= 140; step += 1) {
    const t = step / 140;
    const angle = t * TAU * 3;
    const radius = 5 + t * 28;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * TAU;
    circlePath(ctx, Math.cos(angle) * 39, Math.sin(angle) * 39, 2.6);
  }
  circlePath(ctx, 0, 0, 5);
}

function mandalaLace(ctx) {
  circlePath(ctx, 0, 0, 44);
  petalRing(ctx, 16, 30, 6, 10);
  petalRing(ctx, 8, 16, 6, 11, -Math.PI / 2 + 0.39);
  circlePath(ctx, 0, 0, 11);
  starPoly(ctx, 8, 8, 4);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * TAU;
    circlePath(ctx, Math.cos(angle) * 38, Math.sin(angle) * 38, 2.6);
  }
}

export const NATURE_GROUPS = [
  {
    id: 'garden',
    label: 'Garden',
    items: [
      { id: 'tree', label: 'Tree', draw: tree },
      { id: 'leaf', label: 'Leaf', draw: leaf },
      { id: 'mushroom', label: 'Mushroom', draw: mushroom },
      { id: 'cactus', label: 'Cactus', draw: cactus },
      { id: 'bouquet', label: 'Bouquet', draw: bouquet },
      { id: 'cloud', label: 'Cloud', draw: cloud },
      { id: 'moon', label: 'Moon', draw: moon },
      { id: 'rainbow', label: 'Rainbow', draw: rainbow },
      { id: 'tulip', label: 'Tulip', draw: tulip },
      { id: 'sunflower', label: 'Sunflower', draw: sunflower },
      { id: 'daisy', label: 'Daisy', draw: daisy },
      { id: 'potted-plant', label: 'Potted plant', draw: pottedPlant },
      { id: 'seedling', label: 'Seedling', draw: seedling },
      { id: 'watering-can', label: 'Watering can', draw: wateringCan },
    ],
  },
  {
    id: 'space',
    label: 'Space',
    items: [
      { id: 'planet', label: 'Planet', draw: planet },
      { id: 'rocket', label: 'Rocket', draw: rocket },
      { id: 'comet', label: 'Comet', draw: comet },
      { id: 'ufo', label: 'Flying saucer', draw: ufo },
      { id: 'constellation', label: 'Constellation', draw: constellation },
      { id: 'helmet', label: 'Space helmet', draw: helmet },
      { id: 'telescope', label: 'Telescope', draw: telescope },
      { id: 'satellite', label: 'Satellite', draw: satellite },
      { id: 'galaxy', label: 'Galaxy', draw: galaxy },
    ],
  },
  {
    id: 'mandalas',
    label: 'Mandalas',
    items: [
      { id: 'mandala-sun', label: 'Sun mandala', draw: mandalaSun },
      { id: 'mandala-lotus', label: 'Lotus mandala', draw: mandalaLotus },
      { id: 'mandala-wheel', label: 'Wheel mandala', draw: mandalaWheel },
      { id: 'mandala-scallop', label: 'Scallop mandala', draw: mandalaScallop },
      { id: 'mandala-diamond', label: 'Diamond mandala', draw: mandalaDiamond },
      { id: 'mandala-bloom', label: 'Bloom mandala', draw: mandalaBloom },
      { id: 'mandala-star', label: 'Star mandala', draw: mandalaStar },
      { id: 'mandala-heart', label: 'Heart mandala', draw: mandalaHeart },
      { id: 'mandala-snowflake', label: 'Snowflake mandala', draw: mandalaSnowflake },
      { id: 'mandala-spiral', label: 'Spiral mandala', draw: mandalaSpiral },
      { id: 'mandala-lace', label: 'Lace mandala', draw: mandalaLace },
    ],
  },
];