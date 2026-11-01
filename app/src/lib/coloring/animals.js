// Colouring pages: animals and the creatures from sea and sky.
import { TAU, circlePath, ellipsePath, linePath, petalRing, polyPath, starPoly } from './draw';

function cat(ctx) {
  circlePath(ctx, 0, 6, 33);
  polyPath(ctx, [
    [-32, -12],
    [-30, -44],
    [-8, -25],
  ]);
  polyPath(ctx, [
    [32, -12],
    [30, -44],
    [8, -25],
  ]);
  circlePath(ctx, -12, 0, 4.2);
  circlePath(ctx, 12, 0, 4.2);
  polyPath(ctx, [
    [-5, 12],
    [5, 12],
    [0, 18],
  ]);
  linePath(ctx, -18, 15, -41, 11);
  linePath(ctx, -18, 22, -41, 24);
  linePath(ctx, 18, 15, 41, 11);
  linePath(ctx, 18, 22, 41, 24);
}

function dog(ctx) {
  circlePath(ctx, 0, 2, 32);
  ellipsePath(ctx, -30, -6, 9, 22, -0.3);
  ellipsePath(ctx, 30, -6, 9, 22, 0.3);
  circlePath(ctx, -11, -5, 4);
  circlePath(ctx, 11, -5, 4);
  ellipsePath(ctx, 0, 22, 14, 10);
  ellipsePath(ctx, 0, 14, 5, 4);
  linePath(ctx, 0, 18, 0, 27);
}

function bear(ctx) {
  circlePath(ctx, 0, 6, 32);
  circlePath(ctx, -22, -25, 11);
  circlePath(ctx, 22, -25, 11);
  circlePath(ctx, -11, -2, 3.6);
  circlePath(ctx, 11, -2, 3.6);
  ellipsePath(ctx, 0, 20, 15, 11);
  ellipsePath(ctx, 0, 13, 5.5, 4.2);
}

function bunny(ctx) {
  ellipsePath(ctx, -14, -33, 8, 22, -0.14);
  ellipsePath(ctx, 14, -33, 8, 22, 0.14);
  circlePath(ctx, 0, 8, 30);
  circlePath(ctx, -10, 2, 3.6);
  circlePath(ctx, 10, 2, 3.6);
  polyPath(ctx, [
    [-4, 12],
    [4, 12],
    [0, 17],
  ]);
  linePath(ctx, 0, 17, 0, 24);
}

function fox(ctx) {
  circlePath(ctx, 0, 4, 31);
  polyPath(ctx, [
    [-30, -14],
    [-27, -45],
    [-6, -26],
  ]);
  polyPath(ctx, [
    [30, -14],
    [27, -45],
    [6, -26],
  ]);
  polyPath(ctx, [
    [-19, 9],
    [19, 9],
    [0, 33],
  ]);
  circlePath(ctx, -11, -3, 3.8);
  circlePath(ctx, 11, -3, 3.8);
  ellipsePath(ctx, 0, 24, 5, 4);
}

function owl(ctx) {
  ellipsePath(ctx, 0, 6, 30, 34);
  circlePath(ctx, -13, -3, 11);
  circlePath(ctx, 13, -3, 11);
  circlePath(ctx, -13, -3, 4);
  circlePath(ctx, 13, -3, 4);
  polyPath(ctx, [
    [-5, 9],
    [5, 9],
    [0, 17],
  ]);
  polyPath(ctx, [
    [-30, -18],
    [-24, -42],
    [-9, -30],
  ]);
  polyPath(ctx, [
    [30, -18],
    [24, -42],
    [9, -30],
  ]);
}

function bird(ctx) {
  ellipsePath(ctx, -2, 8, 27, 20);
  circlePath(ctx, 16, -16, 13);
  polyPath(ctx, [
    [27, -19],
    [46, -13],
    [27, -7],
  ]);
  circlePath(ctx, 18, -19, 2.4);
  polyPath(ctx, [
    [-4, 0],
    [-34, -12],
    [-28, 12],
  ]);
  polyPath(ctx, [
    [-26, 4],
    [-46, -4],
    [-38, 18],
  ]);
  linePath(ctx, -6, 26, -8, 38);
  linePath(ctx, 6, 26, 8, 38);
}

function fish(ctx) {
  ellipsePath(ctx, -4, 0, 33, 23);
  polyPath(ctx, [
    [-33, 0],
    [-48, -19],
    [-48, 19],
  ]);
  circlePath(ctx, 16, -6, 3.4);
  ctx.moveTo(4, -4);
  ctx.quadraticCurveTo(14, 6, 25, -2);
  polyPath(ctx, [
    [-8, -19],
    [0, -35],
    [10, -17],
  ]);
  polyPath(ctx, [
    [-8, 19],
    [0, 35],
    [10, 17],
  ]);
}

function turtle(ctx) {
  ellipsePath(ctx, -2, 2, 33, 23);
  circlePath(ctx, 34, 6, 9);
  circlePath(ctx, 35, 3, 1.8);
  [
    [-16, -4],
    [2, -8],
    [20, -4],
    [-14, 14],
    [4, 18],
    [22, 14],
  ].forEach(([x, y]) =>
    polyPath(ctx, [
      [x, y - 4],
      [x + 4.5, y],
      [x, y + 4],
      [x - 4.5, y],
    ])
  );
  ellipsePath(ctx, -28, 20, 7, 4, 0.4);
  ellipsePath(ctx, -28, -16, 7, 4, -0.4);
  ellipsePath(ctx, 24, 20, 7, 4, -0.4);
  ellipsePath(ctx, 24, -16, 7, 4, 0.4);
}

function snail(ctx) {
  circlePath(ctx, -8, -8, 25);
  let first = true;
  for (let step = 0; step <= 90; step += 1) {
    const t = step / 90;
    const angle = t * TAU * 1.9;
    const radius = 3 + t * 20;
    const x = -8 + Math.cos(angle) * radius;
    const y = -8 + Math.sin(angle) * radius;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.moveTo(-30, 16);
  ctx.bezierCurveTo(-8, 34, 26, 32, 42, 8);
  linePath(ctx, 42, 8, 42, -6);
  linePath(ctx, 36, 12, 36, -2);
  circlePath(ctx, 42, -8, 2.4);
  circlePath(ctx, 36, -4, 2);
}

function whale(ctx) {
  ctx.moveTo(-40, 6);
  ctx.bezierCurveTo(-34, -22, 4, -30, 24, -10);
  ctx.bezierCurveTo(34, 0, 30, 20, 10, 24);
  ctx.bezierCurveTo(-12, 28, -36, 24, -40, 6);
  ctx.closePath();
  polyPath(ctx, [
    [22, -8],
    [44, -22],
    [38, 4],
  ]);
  circlePath(ctx, -18, -2, 3);
  ctx.moveTo(-30, 12);
  ctx.quadraticCurveTo(-10, 20, 12, 14);
  ctx.moveTo(-14, -24);
  ctx.quadraticCurveTo(-16, -38, -24, -44);
  ctx.moveTo(-2, -26);
  ctx.quadraticCurveTo(-2, -40, -8, -46);
}

function octopus(ctx) {
  ctx.moveTo(-30, 0);
  ctx.bezierCurveTo(-30, -34, 30, -34, 30, 0);
  ctx.closePath();
  circlePath(ctx, -10, -6, 3.4);
  circlePath(ctx, 10, -6, 3.4);
  ctx.moveTo(-8, 2);
  ctx.quadraticCurveTo(0, 10, 8, 2);
  [-27, -16, -5, 6, 17, 27].forEach((x, index) => {
    const sway = index % 2 === 0 ? -8 : 8;
    ctx.moveTo(x * 0.8, 4);
    ctx.quadraticCurveTo(x + sway, 24, x + sway * 0.4, 42);
    ctx.quadraticCurveTo(x + sway, 30, x * 0.6, 12);
  });
}

function starfish(ctx) {
  starPoly(ctx, 5, 45, 17);
  circlePath(ctx, 0, 0, 6);
  [
    [0, -22],
    [-22, 4],
    [22, 4],
    [-8, 22],
    [8, 22],
  ].forEach(([x, y]) => circlePath(ctx, x, y, 2.6));
}

function seashell(ctx) {
  ctx.moveTo(0, 40);
  ctx.arc(0, 40, 42, Math.PI * 1.16, Math.PI * 1.84, true);
  ctx.closePath();
  for (let index = 1; index < 6; index += 1) {
    const angle = Math.PI * 1.16 + (index / 6) * (Math.PI * 0.68);
    linePath(ctx, 0, 40, Math.cos(angle) * 42, 40 + Math.sin(angle) * 42);
  }
  for (let index = 1; index < 4; index += 1) {
    ctx.moveTo(0, 40);
    ctx.arc(0, 40, 42 - index * 10, Math.PI * 1.16, Math.PI * 1.84, true);
  }
}

function butterfly(ctx) {
  ellipsePath(ctx, 0, 4, 5, 30);
  circlePath(ctx, 0, -26, 7);
  ctx.moveTo(-2, -31);
  ctx.quadraticCurveTo(-12, -44, -20, -46);
  ctx.moveTo(2, -31);
  ctx.quadraticCurveTo(12, -44, 20, -46);
  ctx.moveTo(-4, -6);
  ctx.bezierCurveTo(-34, -34, -48, -6, -14, 8);
  ctx.closePath();
  ctx.moveTo(4, -6);
  ctx.bezierCurveTo(34, -34, 48, -6, 14, 8);
  ctx.closePath();
  ctx.moveTo(-5, 10);
  ctx.bezierCurveTo(-32, 14, -26, 40, -4, 22);
  ctx.closePath();
  ctx.moveTo(5, 10);
  ctx.bezierCurveTo(32, 14, 26, 40, 4, 22);
  ctx.closePath();
  circlePath(ctx, -20, -12, 4);
  circlePath(ctx, 20, -12, 4);
}

function bee(ctx) {
  ellipsePath(ctx, 4, 4, 22, 26);
  circlePath(ctx, -16, -14, 15);
  circlePath(ctx, -20, -18, 2.6);
  ellipsePath(ctx, -4, -26, 16, 9, -0.7);
  ellipsePath(ctx, 16, -24, 13, 8, 0.5);
  [-2, 12, 24].forEach((y) => {
    ctx.moveTo(-14, y);
    ctx.quadraticCurveTo(4, y + 8, 24, y - 2);
  });
  polyPath(ctx, [
    [24, 2],
    [40, -4],
    [26, 12],
  ]);
  linePath(ctx, -26, -22, -34, -34);
  linePath(ctx, -14, -26, -16, -40);
}

function ladybug(ctx) {
  ellipsePath(ctx, 0, 4, 33, 30);
  ctx.moveTo(-2, -26);
  ctx.bezierCurveTo(-16, -44, 16, -44, 2, -26);
  ctx.closePath();
  linePath(ctx, 0, -18, 0, 33);
  [
    [-16, -6],
    [16, -6],
    [-18, 18],
    [18, 18],
  ].forEach(([x, y]) => circlePath(ctx, x, y, 4.6));
  circlePath(ctx, -7, -30, 2.6);
  circlePath(ctx, 7, -30, 2.6);
  linePath(ctx, -8, -38, -16, -46);
  linePath(ctx, 8, -38, 16, -46);
}

function dragonfly(ctx) {
  ellipsePath(ctx, 0, 8, 6, 26);
  circlePath(ctx, 0, -22, 10);
  circlePath(ctx, -5, -24, 4);
  circlePath(ctx, 5, -24, 4);
  ellipsePath(ctx, -22, -10, 22, 8, -0.25);
  ellipsePath(ctx, 22, -10, 22, 8, 0.25);
  ellipsePath(ctx, -20, 12, 18, 6, 0.2);
  ellipsePath(ctx, 20, 12, 18, 6, -0.2);
  for (let index = 1; index < 4; index += 1) {
    linePath(ctx, -6, index * 12, 6, index * 12);
  }
}

function panda(ctx) {
  circlePath(ctx, -23, -24, 11);
  circlePath(ctx, 23, -24, 11);
  circlePath(ctx, 0, 4, 31);
  ellipsePath(ctx, -12, -1, 10, 12, 0.24);
  ellipsePath(ctx, 12, -1, 10, 12, -0.24);
  circlePath(ctx, -12, 1, 3.6);
  circlePath(ctx, 12, 1, 3.6);
  ellipsePath(ctx, 0, 20, 6, 4.5);
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(-5, 30, -10, 25);
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(5, 30, 10, 25);
}

function penguin(ctx) {
  ellipsePath(ctx, 0, 8, 27, 35);
  ellipsePath(ctx, 0, 16, 16, 24);
  polyPath(ctx, [
    [-8, -14],
    [8, -14],
    [0, -3],
  ]);
  circlePath(ctx, -9, -21, 3.6);
  circlePath(ctx, 9, -21, 3.6);
  polyPath(ctx, [
    [-24, -4],
    [-36, 14],
    [-27, 30],
    [-18, 10],
  ]);
  polyPath(ctx, [
    [24, -4],
    [36, 14],
    [27, 30],
    [18, 10],
  ]);
  ellipsePath(ctx, -12, 42, 9, 5, 0.2);
  ellipsePath(ctx, 12, 42, 9, 5, -0.2);
}

function elephant(ctx) {
  ellipsePath(ctx, -30, 0, 13, 22, 0.26);
  ellipsePath(ctx, 30, 0, 13, 22, -0.26);
  circlePath(ctx, 0, -2, 30);
  circlePath(ctx, -11, -8, 3.6);
  circlePath(ctx, 11, -8, 3.6);
  ctx.moveTo(-9, 14);
  ctx.bezierCurveTo(-11, 34, 0, 44, 12, 40);
  ctx.lineTo(16, 32);
  ctx.bezierCurveTo(4, 34, -1, 26, 2, 14);
  ctx.closePath();
  linePath(ctx, -15, 20, -21, 32);
  linePath(ctx, 15, 20, 21, 32);
  circlePath(ctx, -21, 35, 2.8);
  circlePath(ctx, 21, 35, 2.8);
}

function giraffe(ctx) {
  polyPath(ctx, [
    [-11, -10],
    [11, -10],
    [18, 28],
    [-18, 28],
  ]);
  [
    [-6, 2, 4],
    [4, -2, 3.6],
    [-4, 12, 4.2],
    [7, 15, 3.2],
    [0, 24, 3],
  ].forEach(([x, y, size]) => circlePath(ctx, x, y, size));
  ellipsePath(ctx, 0, -22, 14, 11);
  linePath(ctx, -13, -16, -23, -21);
  ellipsePath(ctx, -25, -24, 5, 3.5, -0.4);
  linePath(ctx, 13, -16, 23, -21);
  ellipsePath(ctx, 25, -24, 5, 3.5, 0.4);
  linePath(ctx, -6, -32, -8, -39);
  circlePath(ctx, -8, -42, 4);
  linePath(ctx, 6, -32, 8, -39);
  circlePath(ctx, 8, -42, 4);
  circlePath(ctx, -6, -25, 2.6);
  circlePath(ctx, 6, -25, 2.6);
  ellipsePath(ctx, 0, -14, 5, 3);
}

function lion(ctx) {
  petalRing(ctx, 12, 32, 11, 15);
  circlePath(ctx, 0, 0, 27);
  circlePath(ctx, -21, -20, 7);
  circlePath(ctx, 21, -20, 7);
  circlePath(ctx, -10, -6, 3.6);
  circlePath(ctx, 10, -6, 3.6);
  polyPath(ctx, [
    [-7, 4],
    [7, 4],
    [0, 12],
  ]);
  ctx.moveTo(0, 12);
  ctx.quadraticCurveTo(-5, 18, -10, 13);
  ctx.moveTo(0, 12);
  ctx.quadraticCurveTo(5, 18, 10, 13);
}

function koala(ctx) {
  circlePath(ctx, -28, -16, 14);
  circlePath(ctx, -28, -16, 7.5);
  circlePath(ctx, 28, -16, 14);
  circlePath(ctx, 28, -16, 7.5);
  circlePath(ctx, 0, 6, 29);
  circlePath(ctx, -12, -4, 3.8);
  circlePath(ctx, 12, -4, 3.8);
  ellipsePath(ctx, 0, 12, 9, 12);
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(-6, 29, -11, 24);
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(6, 29, 11, 24);
}

export const ANIMAL_GROUPS = [
  {
    id: 'animals',
    label: 'Animals',
    items: [
      { id: 'cat', label: 'Cat', draw: cat },
      { id: 'dog', label: 'Dog', draw: dog },
      { id: 'bear', label: 'Bear', draw: bear },
      { id: 'bunny', label: 'Bunny', draw: bunny },
      { id: 'fox', label: 'Fox', draw: fox },
      { id: 'owl', label: 'Owl', draw: owl },
      { id: 'bird', label: 'Bird', draw: bird },
      { id: 'fish', label: 'Fish', draw: fish },
      { id: 'turtle', label: 'Turtle', draw: turtle },
      { id: 'snail', label: 'Snail', draw: snail },
      { id: 'panda', label: 'Panda', draw: panda },
      { id: 'penguin', label: 'Penguin', draw: penguin },
      { id: 'elephant', label: 'Elephant', draw: elephant },
      { id: 'giraffe', label: 'Giraffe', draw: giraffe },
      { id: 'lion', label: 'Lion', draw: lion },
      { id: 'koala', label: 'Koala', draw: koala },
    ],
  },
  {
    id: 'sea',
    label: 'Sea & bugs',
    items: [
      { id: 'whale', label: 'Whale', draw: whale },
      { id: 'octopus', label: 'Octopus', draw: octopus },
      { id: 'starfish', label: 'Starfish', draw: starfish },
      { id: 'seashell', label: 'Seashell', draw: seashell },
      { id: 'butterfly', label: 'Butterfly', draw: butterfly },
      { id: 'bee', label: 'Bee', draw: bee },
      { id: 'ladybug', label: 'Ladybug', draw: ladybug },
      { id: 'dragonfly', label: 'Dragonfly', draw: dragonfly },
    ],
  },
];