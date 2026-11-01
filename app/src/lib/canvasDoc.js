// The drawing's saved shape: a stack of layers, each holding the marks made on it.
import { CANVAS_HEIGHT, CANVAS_WIDTH, MIRROR_MODES, TOOL_IDS } from './canvasPaint';

export const MAX_LAYERS = 6;
export const MAX_STROKES = 240;
export const MAX_POINTS = 600;

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export function makeLayer(name) {
  return { id: uid(), name: name || 'Layer', hidden: false, opacity: 1, strokes: [] };
}

export function pointsToPath(points) {
  return points
    .slice(0, MAX_POINTS)
    .map(([x, y]) => `${Math.round(x)},${Math.round(y)}`)
    .join(' ');
}

export function pathToPoints(path) {
  return (path || '')
    .split(' ')
    .filter(Boolean)
    .map((pair) => pair.split(',').map(Number))
    .filter((pair) => pair.length === 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
    .map(([x, y]) => [
      Math.max(0, Math.min(CANVAS_WIDTH, x)),
      Math.max(0, Math.min(CANVAS_HEIGHT, y)),
    ]);
}

function serializeStroke(stroke) {
  return {
    t: stroke.tool,
    c: stroke.color,
    w: stroke.width,
    o: stroke.opacity ?? 1,
    m: stroke.mirror || 'off',
    e: stroke.emoji || '',
    ti: stroke.tip || '',
    p: pointsToPath(stroke.points),
    a: Number(stroke.a) || 0,
    q: Number(stroke.q) || 0,
  };
}

function parseStroke(raw) {
  const tool = TOOL_IDS.includes(raw.t) ? raw.t : 'pen';
  return {
    tool,
    color: typeof raw.c === 'string' ? raw.c : '#e2e8f0',
    width: Math.max(1, Number(raw.w) || 4),
    opacity: Number.isFinite(Number(raw.o)) ? Math.max(0.05, Math.min(1, Number(raw.o))) : 1,
    mirror: MIRROR_MODES.includes(raw.m) ? raw.m : 'off',
    emoji: typeof raw.e === 'string' ? raw.e : '',
    tip: typeof raw.ti === 'string' ? raw.ti : '',
    points: pathToPoints(raw.p),
    a: Number(raw.a) || 0,
    q: Number(raw.q) || 0,
  };
}

export function serializeLayers(layers) {
  return layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    hidden: layer.hidden,
    opacity: layer.opacity,
    strokes: layer.strokes.map(serializeStroke),
  }));
}

// Reads a saved doc, including drawings made before layers existed.
export function readDoc(doc) {
  const layered = Array.isArray(doc?.layers) ? doc.layers.filter((layer) => layer && layer.id) : [];
  if (layered.length) {
    return layered.map((layer) => ({
      id: String(layer.id),
      name: typeof layer.name === 'string' && layer.name ? layer.name : 'Layer',
      hidden: layer.hidden === true,
      opacity: Number.isFinite(Number(layer.opacity)) ? Math.max(0, Math.min(1, Number(layer.opacity))) : 1,
      strokes: (Array.isArray(layer.strokes) ? layer.strokes : []).map(parseStroke),
    }));
  }
  const legacy = Array.isArray(doc?.strokes) ? doc.strokes : [];
  const layer = makeLayer('Layer 1');
  layer.strokes = legacy.map((stroke) => ({
    tool: 'pen',
    color: stroke.c || '#e2e8f0',
    width: Math.max(1, Number(stroke.w) || 4),
    opacity: 1,
    mirror: 'off',
    emoji: '',
    points: pathToPoints(stroke.p),
    a: 0,
    q: 0,
  }));
  return [layer];
}

// Oldest strokes fall away so the page never grows unbounded.
export function trimLayers(layers) {
  let total = layers.reduce((sum, layer) => sum + layer.strokes.length, 0);
  if (total <= MAX_STROKES) return layers;
  const next = layers.map((layer) => ({ ...layer, strokes: [...layer.strokes] }));
  while (total > MAX_STROKES) {
    const fattest = next.reduce((a, b) => (b.strokes.length > a.strokes.length ? b : a));
    if (!fattest.strokes.length) break;
    fattest.strokes.shift();
    total -= 1;
  }
  return next;
}