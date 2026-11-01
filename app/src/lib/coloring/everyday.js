// Colouring pages: treats, celebrations and patterns to fill in.
import { circlePath, ellipsePath, linePath, polyPath, starPoly, TAU, wobbleRing } from './draw';

function cupcake(ctx) {
  polyPath(ctx, [
    [-24, 4],
    [-17, 42],
    [17, 42],
    [24, 4],
  ]);
  for (let index = -1; index <= 1; index += 1) {
    linePath(ctx, index * 8, 4, index * 5, 42);
  }
  ctx.moveTo(-26, 4);
  ctx.bezierCurveTo(-30, -18, -14, -22, -6, -12);
  ctx.bezierCurveTo(0, -32, 18, -30, 20, -12);
  ctx.bezierCurveTo(30, -8, 28, 4, 24, 4);
  ctx.closePath();
  circlePath(ctx, 0, -30, 5);
}

function icecream(ctx) {
  polyPath(ctx, [
    [-18, 4],
    [0, 44],
    [18, 4],
  ]);
  linePath(ctx, -14, 14, 8, 20);
  linePath(ctx, 14, 14, -8, 20);
  linePath(ctx, -8, 26, 5, 30);
  circlePath(ctx, 0, -12, 20);
  circlePath(ctx, -14, -22, 12);
  circlePath(ctx, 14, -22, 12);
  circlePath(ctx, 0, -34, 10);
}

function donut(ctx) {
  circlePath(ctx, 0, 0, 44);
  circlePath(ctx, 0, 0, 15);
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * TAU;
    linePath(ctx, Math.cos(angle) * 44, Math.sin(angle) * 44, Math.cos(angle + 0.3) * 30, Math.sin(angle + 0.3) * 30);
  }
  [
    [-24, -14],
    [10, -26],
    [26, 6],
    [-6, 22],
  ].forEach(([x, y]) => linePath(ctx, x, y, x + 6, y + 8));
}

function lollipop(ctx) {
  circlePath(ctx, 0, -14, 28);
  let first = true;
  for (let step = 0; step <= 120; step += 1) {
    const t = step / 120;
    const angle = t * TAU * 2.4;
    const radius = 3 + t * 22;
    const x = Math.cos(angle) * radius;
    const y = -14 + Math.sin(angle) * radius;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  polyPath(ctx, [
    [-4, 14],
    [4, 14],
    [4, 46],
    [-4, 46],
  ]);
}

function candy(ctx) {
  ellipsePath(ctx, 0, 0, 21, 16);
  polyPath(ctx, [
    [-21, 0],
    [-42, -16],
    [-38, 16],
    [-21, 0],
  ]);
  polyPath(ctx, [
    [21, 0],
    [42, -16],
    [38, 16],
    [21, 0],
  ]);
  linePath(ctx, -10, -14, -4, 14);
  linePath(ctx, 0, -16, 6, 16);
  linePath(ctx, 10, -14, 16, 12);
}

function cakeslice(ctx) {
  polyPath(ctx, [
    [-34, 40],
    [34, 40],
    [34, -8],
    [0, -34],
    [-34, -8],
  ]);
  linePath(ctx, -34, 8, 34, 8);
  linePath(ctx, -34, 24, 34, 24);
  ctx.moveTo(-34, -8);
  ctx.quadraticCurveTo(0, 4, 34, -8);
  circlePath(ctx, 0, -34, 7);
}

function balloon(ctx) {
  ctx.moveTo(0, -44);
  ctx.bezierCurveTo(26, -44, 32, -14, 0, 8);
  ctx.bezierCurveTo(-32, -14, -26, -44, 0, -44);
  ctx.closePath();
  polyPath(ctx, [
    [-5, 8],
    [5, 8],
    [0, 16],
  ]);
  ctx.moveTo(0, 16);
  ctx.bezierCurveTo(-12, 26, 12, 32, 0, 44);
}

function gift(ctx) {
  polyPath(ctx, [
    [-30, -6],
    [30, -6],
    [30, 40],
    [-30, 40],
  ]);
  polyPath(ctx, [
    [-34, -22],
    [34, -22],
    [34, -6],
    [-34, -6],
  ]);
  linePath(ctx, 0, -22, 0, 40);
  linePath(ctx, -30, 12, 30, 12);
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(-26, -40, -40, -22, 0, -22);
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(26, -40, 40, -22, 0, -22);
}

function partyhat(ctx) {
  polyPath(ctx, [
    [0, -40],
    [26, 36],
    [-26, 36],
  ]);
  for (let index = 0; index < 3; index += 1) {
    linePath(ctx, -18 + index * 8, 12 + index * 8, 18 - index * 8, 12 + index * 8);
  }
  circlePath(ctx, 0, -44, 6);
  ellipsePath(ctx, 0, 38, 30, 6);
}

function kite(ctx) {
  polyPath(ctx, [
    [0, -44],
    [26, -8],
    [0, 30],
    [-26, -8],
  ]);
  linePath(ctx, 0, -44, 0, 30);
  linePath(ctx, -26, -8, 26, -8);
  ctx.moveTo(0, 30);
  ctx.bezierCurveTo(-14, 38, 14, 44, 0, 50);
  [
    [-12, 34],
    [12, 42],
  ].forEach(([x, y]) =>
    polyPath(ctx, [
      [x, y - 5],
      [x + 7, y],
      [x, y + 5],
      [x - 7, y],
    ])
  );
}

function pinwheel(ctx) {
  circlePath(ctx, 0, -4, 5);
  [0, 1, 2, 3].forEach((index) => {
    const angle = (index / 4) * TAU;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    polyPath(ctx, [
      [0, -4],
      [cos * 42 - sin * 8, -4 + sin * 42 + cos * 8],
      [cos * 34 + sin * 14, -4 + sin * 34 - cos * 14],
    ]);
  });
  linePath(ctx, 0, 1, 0, 46);
}

function checker(ctx) {
  const step = 22;
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      if ((row + column) % 2 === 0) {
        polyPath(ctx, [
          [column * step - 44, row * step - 44],
          [column * step - 44 + step, row * step - 44],
          [column * step - 44 + step, row * step - 44 + step],
          [column * step - 44, row * step - 44 + step],
        ]);
      }
    }
  }
}

function stripes(ctx) {
  polyPath(ctx, [
    [-44, -44],
    [44, -44],
    [44, 44],
    [-44, 44],
  ]);
  for (let index = -5; index <= 5; index += 1) {
    linePath(ctx, index * 18 - 44, 44, index * 18 + 44, -44);
  }
}

function scales(ctx) {
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const x = column * 18 - 45 + (row % 2 === 0 ? 0 : 9);
      const y = row * 18 - 40;
      ctx.moveTo(x, y + 18);
      ctx.arc(x + 9, y + 9, 9, Math.PI, 0, true);
    }
  }
}

function honeycomb(ctx) {
  const points = (cx, cy) =>
    Array.from({ length: 6 }, (_, index) => {
      const angle = -Math.PI / 2 + (index / 6) * TAU;
      return [cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15];
    });
  [
    [0, 0],
    [-26, 0],
    [26, 0],
    [-13, -23],
    [13, -23],
    [-13, 23],
    [13, 23],
  ].forEach(([cx, cy]) => polyPath(ctx, points(cx, cy)));
}

function dots(ctx) {
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      circlePath(ctx, column * 20 - 40, row * 20 - 40, 6 + ((row + column) % 2) * 2.5);
    }
  }
}

function zigzag(ctx) {
  for (let row = 0; row < 5; row += 1) {
    const base = row * 20 - 40;
    ctx.moveTo(-44, base);
    for (let x = -44; x <= 44; x += 11) {
      ctx.lineTo(x, base + (Math.round((x + 44) / 11) % 2 === 0 ? 0 : 12));
    }
  }
}

function cookie(ctx) {
  wobbleRing(ctx, 36, 9, 3);
  [
    [-15, -12, 5],
    [12, -16, 4.5],
    [19, 8, 5],
    [-6, 15, 4],
    [-23, 5, 3.5],
    [3, -1, 3],
  ].forEach(([x, y, size]) => circlePath(ctx, x, y, size));
}

function popsicle(ctx) {
  ctx.moveTo(-19, -38);
  ctx.bezierCurveTo(-19, -46, 19, -46, 19, -38);
  ctx.lineTo(19, 6);
  ctx.quadraticCurveTo(19, 16, 8, 16);
  ctx.lineTo(-8, 16);
  ctx.quadraticCurveTo(-19, 16, -19, 6);
  ctx.closePath();
  polyPath(ctx, [
    [-5, 16],
    [5, 16],
    [5, 44],
    [-5, 44],
  ]);
  linePath(ctx, -19, -6, 19, -6);
}

function chocolate(ctx) {
  polyPath(ctx, [
    [-34, -26],
    [34, -26],
    [34, 26],
    [-34, 26],
  ]);
  [-11, 11].forEach((x) => linePath(ctx, x, -26, x, 26));
  linePath(ctx, -34, 0, 34, 0);
  polyPath(ctx, [
    [34, -26],
    [16, -26],
    [34, -8],
  ]);
}

function macaron(ctx) {
  ellipsePath(ctx, 0, -12, 30, 14);
  ellipsePath(ctx, 0, 12, 30, 14);
  polyPath(ctx, [
    [-28, -2],
    [28, -2],
    [28, 2],
    [-28, 2],
  ]);
  linePath(ctx, -22, 12, 22, 12);
}

function crown(ctx) {
  polyPath(ctx, [
    [-36, 22],
    [36, 22],
    [36, -6],
    [24, 8],
    [12, -20],
    [0, 6],
    [-12, -20],
    [-24, 8],
    [-36, -6],
  ]);
  linePath(ctx, -36, 8, 36, 8);
  [
    [-18, 15],
    [0, 15],
    [18, 15],
  ].forEach(([x, y]) => circlePath(ctx, x, y, 3));
  circlePath(ctx, 12, -12, 3.2);
  circlePath(ctx, -12, -12, 3.2);
}

function bunting(ctx) {
  ctx.moveTo(-44, -34);
  ctx.quadraticCurveTo(0, -16, 44, -34);
  for (let index = 0; index <= 4; index += 1) {
    const t = index / 4;
    const x = -34 + t * 68;
    const y = (1 - t) * (1 - t) * -34 + 2 * t * (1 - t) * -16 + t * t * -34;
    polyPath(ctx, [
      [x - 9, y],
      [x + 9, y],
      [x, y + 22],
    ]);
  }
}

function firework(ctx) {
  starPoly(ctx, 12, 20, 8);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * TAU;
    linePath(
      ctx,
      Math.cos(angle) * 27,
      Math.sin(angle) * 27,
      Math.cos(angle) * 41,
      Math.sin(angle) * 41
    );
    circlePath(ctx, Math.cos(angle) * 45, Math.sin(angle) * 45, 2.6);
  }
}

function confetti(ctx) {
  polyPath(ctx, [
    [-42, 38],
    [-8, 4],
    [6, 20],
  ]);
  linePath(ctx, -34, 30, -12, 12);
  for (let index = 0; index < 6; index += 1) {
    const angle = -2.5 + (index / 5) * 2.1;
    linePath(ctx, -4, 6, -4 + Math.cos(angle) * 36, 6 + Math.sin(angle) * 36);
  }
  [
    [-30, -22],
    [-2, -34],
    [24, -22],
    [40, -2],
    [6, -16],
  ].forEach(([x, y]) =>
    polyPath(ctx, [
      [x, y - 5],
      [x + 5, y],
      [x, y + 5],
      [x - 5, y],
    ])
  );
  circlePath(ctx, -20, -34, 3);
}

export const EVERYDAY_GROUPS = [
  {
    id: 'treats',
    label: 'Treats',
    items: [
      { id: 'cupcake', label: 'Cupcake', draw: cupcake },
      { id: 'icecream', label: 'Ice cream', draw: icecream },
      { id: 'donut', label: 'Donut', draw: donut },
      { id: 'lollipop', label: 'Lollipop', draw: lollipop },
      { id: 'candy', label: 'Candy', draw: candy },
      { id: 'cakeslice', label: 'Cake slice', draw: cakeslice },
      { id: 'cookie', label: 'Cookie', draw: cookie },
      { id: 'popsicle', label: 'Popsicle', draw: popsicle },
      { id: 'chocolate', label: 'Chocolate bar', draw: chocolate },
      { id: 'macaron', label: 'Macaron', draw: macaron },
    ],
  },
  {
    id: 'celebration',
    label: 'Celebration',
    items: [
      { id: 'balloon', label: 'Balloon', draw: balloon },
      { id: 'gift', label: 'Gift', draw: gift },
      { id: 'partyhat', label: 'Party hat', draw: partyhat },
      { id: 'kite', label: 'Kite', draw: kite },
      { id: 'pinwheel', label: 'Pinwheel', draw: pinwheel },
      { id: 'crown', label: 'Crown', draw: crown },
      { id: 'bunting', label: 'Bunting', draw: bunting },
      { id: 'firework', label: 'Firework', draw: firework },
      { id: 'confetti', label: 'Confetti popper', draw: confetti },
    ],
  },
  {
    id: 'patterns',
    label: 'Patterns',
    items: [
      { id: 'checker', label: 'Checkerboard', draw: checker },
      { id: 'stripes', label: 'Stripes', draw: stripes },
      { id: 'scales', label: 'Scales', draw: scales },
      { id: 'honeycomb', label: 'Honeycomb', draw: honeycomb },
      { id: 'dots', label: 'Dots', draw: dots },
      { id: 'zigzag', label: 'Zigzag', draw: zigzag },
    ],
  },
];