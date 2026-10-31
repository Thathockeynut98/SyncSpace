import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import CanvasToolbar from './CanvasToolbar';
import { TOOLS } from '@/lib/canvasTools';
import CanvasBrushPanel from './CanvasBrushPanel';
import CanvasLayers from './CanvasLayers';
import CanvasPaper from './CanvasPaper';
import { DEFAULT_PAPER, isPaperColour } from '@/lib/canvasPaper';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SHAPE_TOOLS,
  TIP_TOOLS,
  TOOL_IDS,
  fillRegion,
  mirroredPoints,
  paintLive,
  paintStencil,
  paintStroke,
} from '@/lib/canvasPaint';
import { findStencil, stencilKey } from '@/lib/canvasStencils';
import { MAX_LAYERS, MAX_STROKES, makeLayer, readDoc, serializeLayers, trimLayers } from '@/lib/canvasDoc';
import { registerTexture } from '@/lib/canvasTips';
import { signFile } from '@/lib/spaceData';

const EXTRA_HEIGHT = 800;

export default function CanvasStudio({ space, user, room }) {
  const { on, send, seat } = room;
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const layerCanvases = useRef(new Map());
  const layersRef = useRef([makeLayer('Layer 1')]);
  const activeIdRef = useRef(layersRef.current[0].id);
  const activeRef = useRef(null);
  const remoteRef = useRef(new Map());
  const pendingRef = useRef([]);
  const flushRef = useRef(null);
  const saveRef = useRef(null);
  const rafRef = useRef(0);
  const seqRef = useRef(0);
  const redoRef = useRef([]);
  const docIdRef = useRef(null);
  const paperRef = useRef(0);
  const heightRef = useRef(CANVAS_HEIGHT);

  const [layers, setLayers] = useState(layersRef.current);
  const [activeId, setActiveId] = useState(activeIdRef.current);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#818cf8');
  const [width, setWidth] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [mirror, setMirror] = useState('off');
  const [stamp, setStamp] = useState('❤️');
  const [stencilId, setStencilId] = useState('daisy');
  const [stencilFilled, setStencilFilled] = useState(false);
  const [stencilSize, setStencilSize] = useState(280);
  const [tipId, setTipId] = useState('round');
  const [bg, setBg] = useState(DEFAULT_PAPER);
  const [textures, setTextures] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [peerCursor, setPeerCursor] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [tall, setTall] = useState(false);

  const applyLayers = useCallback((next) => {
    layersRef.current = next;
    setLayers(next);
  }, []);

  const findLayer = (id) => layersRef.current.find((layer) => layer.id === id) || null;

  const layerCanvas = (id) => {
    let canvas = layerCanvases.current.get(id);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = heightRef.current;
      layerCanvases.current.set(id, canvas);
    }
    return canvas;
  };

  const composite = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, heightRef.current);
    layersRef.current.forEach((layer) => {
      if (layer.hidden) return;
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.drawImage(layerCanvas(layer.id), 0, 0);
    });
    ctx.globalAlpha = 1;
  }, []);

  const scheduleComposite = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      composite();
    });
  }, [composite]);

  const repaintLayer = useCallback(
    (layer, extra) => {
      const ctx = layerCanvas(layer.id).getContext('2d');
      ctx.clearRect(0, 0, CANVAS_WIDTH, heightRef.current);
      layer.strokes.forEach((stroke) => paintStroke(ctx, stroke));
      if (extra) paintStroke(ctx, extra);
      scheduleComposite();
    },
    [scheduleComposite]
  );

  const repaintAll = useCallback(() => {
    layersRef.current.forEach((layer) => {
      const ctx = layerCanvas(layer.id).getContext('2d');
      ctx.clearRect(0, 0, CANVAS_WIDTH, heightRef.current);
      layer.strokes.forEach((stroke) => paintStroke(ctx, stroke));
    });
    scheduleComposite();
  }, [scheduleComposite]);

  useEffect(() => {
    const next = tall ? CANVAS_HEIGHT + EXTRA_HEIGHT : CANVAS_HEIGHT;
    if (next === heightRef.current) return;
    heightRef.current = next;
    layerCanvases.current.clear();
    if (canvasRef.current) {
      canvasRef.current.width = CANVAS_WIDTH;
      canvasRef.current.height = next;
    }
    repaintAll();
  }, [tall, repaintAll]);

  const persist = useCallback(async () => {
    const body = {
      space_id: space.id,
      layers: serializeLayers(layersRef.current),
      strokes: [],
      bg,
      last_editor_name: user?.full_name || '',
    };
    if (docIdRef.current) {
      await base44.entities.CanvasDoc.update(docIdRef.current, body);
    } else {
      const created = await base44.entities.CanvasDoc.create(body);
      docIdRef.current = created.id;
    }
  }, [space.id, user, bg]);

  const scheduleSave = useCallback(() => {
    window.clearTimeout(saveRef.current);
    saveRef.current = window.setTimeout(() => persist(), 1200);
  }, [persist]);

  const syncNow = useCallback(async () => {
    window.clearTimeout(saveRef.current);
    await persist();
    send({ type: 'canvas' });
  }, [persist, send]);

  const refreshHistory = useCallback(() => {
    setCanUndo(
      layersRef.current.some((layer) => layer.strokes.some((stroke) => stroke.a === seat))
    );
    setCanRedo(redoRef.current.length > 0);
  }, [seat]);

  // Textures the two of you have uploaded into this space.
  const loadTextures = useCallback(async () => {
    const page = await base44.entities.BrushTip.filter(
      { space_id: space.id },
      { sort: 'created_date', limit: 40 }
    );
    const loaded = await Promise.all(
      page.items.map(async (item) => {
        const id = `custom:${item.id}`;
        try {
          await registerTexture(id, await signFile(item.file_uri));
          return { id, name: item.name || 'My texture' };
        } catch (error) {
          return null;
        }
      })
    );
    setTextures(loaded.filter(Boolean));
  }, [space.id]);

  useEffect(() => {
    loadTextures();
  }, [loadTextures]);

  const loadDoc = useCallback(async () => {
    const page = await base44.entities.CanvasDoc.filter(
      { space_id: space.id },
      { sort: '-updated_date', limit: 1 }
    );
    const doc = page.items[0];
    if (!doc) return;
    docIdRef.current = doc.id;
    setBg(isPaperColour(doc.bg) ? doc.bg : DEFAULT_PAPER);
    const next = readDoc(doc);
    applyLayers(next);
    activeIdRef.current = next[0].id;
    setActiveId(next[0].id);
    seqRef.current = next.reduce(
      (max, layer) => Math.max(max, ...layer.strokes.map((stroke) => stroke.q || 0)),
      0
    );
    redoRef.current = [];
    repaintAll();
    refreshHistory();
  }, [space.id, applyLayers, repaintAll, refreshHistory]);

  useEffect(() => {
    loadDoc();
  }, [loadDoc]);

  useEffect(
    () => () => {
      window.clearTimeout(saveRef.current);
      window.clearTimeout(flushRef.current);
      window.clearTimeout(paperRef.current);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // What the other person is painting, as it happens.
  useEffect(() => {
    const offDraw = on('draw', (message) => {
      if (message.from === seat || !Array.isArray(message.pts) || !message.pts.length) return;
      const layerId = findLayer(message.l) ? message.l : activeIdRef.current;
      const layer = findLayer(layerId);
      if (!layer) return;
      const ctx = layerCanvas(layerId).getContext('2d');
      if (message.t === 'fill') {
        const open = remoteRef.current.get(message.from);
        if (message.start || !open) {
          mirroredPoints(message.pts[0], message.m || 'off').forEach((spot) =>
            fillRegion(ctx, spot, message.c || '#818cf8', message.o ?? 1)
          );
          scheduleComposite();
          remoteRef.current.set(message.from, {
            layerId,
            stroke: {
              tool: 'fill',
              color: message.c || '#818cf8',
              width: 1,
              opacity: message.o ?? 1,
              mirror: message.m || 'off',
              emoji: '',
              points: [message.pts[0]],
              a: message.from,
              q: 0,
            },
          });
        }
        if (message.end) {
          const poured = remoteRef.current.get(message.from);
          if (poured) layer.strokes.push(poured.stroke);
          remoteRef.current.delete(message.from);
          setLayers((previous) => [...previous]);
          scheduleSave();
        }
        return;
      }
      if (message.t === 'stencil') {
        const ctx = layerCanvas(layerId).getContext('2d');
        let placed = remoteRef.current.get(message.from);
        if (message.start || !placed) {
          placed = {
            layerId,
            stroke: {
              tool: 'stencil',
              color: message.c || '#818cf8',
              width: message.w || 280,
              opacity: message.o ?? 1,
              mirror: message.m || 'off',
              emoji: message.e || findStencil('daisy').id,
              points: [message.pts[0]],
              a: message.from,
              q: 0,
            },
          };
          remoteRef.current.set(message.from, placed);
          mirroredPoints(placed.stroke.points[0], placed.stroke.mirror).forEach((spot) =>
            paintStencil(ctx, placed.stroke, spot)
          );
          scheduleComposite();
        }
        if (message.end) {
          if (placed) layer.strokes.push(placed.stroke);
          remoteRef.current.delete(message.from);
          setLayers((previous) => [...previous]);
          scheduleSave();
        }
        return;
      }
      let remote = remoteRef.current.get(message.from);
      if (message.start || !remote || remote.layerId !== layerId) {
        remote = {
          layerId,
          stroke: {
            tool: TOOL_IDS.includes(message.t) ? message.t : 'pen',
            color: message.c || '#818cf8',
            width: message.w || 4,
            opacity: message.o ?? 1,
            mirror: message.m || 'off',
            emoji: message.e || '',
            tip: message.ti || '',
            points: [],
            a: message.from,
            q: 0,
          },
        };
        remoteRef.current.set(message.from, remote);
      }
      const stroke = remote.stroke;
      if (SHAPE_TOOLS.includes(stroke.tool)) {
        if (!stroke.points.length) stroke.points.push(message.pts[0]);
        stroke.points[1] = message.pts[message.pts.length - 1];
        repaintLayer(layer, stroke);
      } else {
        message.pts.forEach((point) => {
          paintLive(ctx, stroke, point, stroke.points[stroke.points.length - 1]);
          stroke.points.push(point);
        });
        scheduleComposite();
      }
      if (message.end) {
        layer.strokes.push(stroke);
        remoteRef.current.delete(message.from);
        setLayers((previous) => [...previous]);
        scheduleSave();
      }
    });

    const offClear = on('clear', (message) => {
      if (message.from === seat) return;
      applyLayers(layersRef.current.map((layer) => ({ ...layer, strokes: [] })));
      remoteRef.current.clear();
      repaintAll();
      refreshHistory();
    });

    const offSync = on('canvas', (message) => {
      if (message.from === seat) return;
      loadDoc();
    });

    const offTips = on('tips', async (message) => {
      if (message.from === seat) return;
      await loadTextures();
      repaintAll();
    });

    const offBg = on('bg', (message) => {
      if (message.from === seat) return;
      if (isPaperColour(message.c)) setBg(message.c);
    });

    const offCursor = on('cursor', (message) => {
      if (message.from === seat) return;
      setPeerCursor(message.active ? { name: message.name, x: message.x, y: message.y } : null);
    });

    return () => {
      offDraw();
      offClear();
      offSync();
      offTips();
      offBg();
      offCursor();
    };
  }, [
    on,
    seat,
    applyLayers,
    loadDoc,
    loadTextures,
    refreshHistory,
    repaintAll,
    repaintLayer,
    scheduleComposite,
    scheduleSave,
  ]);

  const toPoint = (event) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * heightRef.current;
    return [
      Math.max(0, Math.min(CANVAS_WIDTH, x)),
      Math.max(0, Math.min(heightRef.current, y)),
    ];
  };

  const flush = () => {
    if (flushRef.current || !pendingRef.current.length) return;
    flushRef.current = window.setTimeout(() => {
      flushRef.current = null;
      const active = activeRef.current;
      if (!active || !pendingRef.current.length) return;
      const { stroke, layerId } = active;
      send({
        type: 'draw',
        t: stroke.tool,
        c: stroke.color,
        w: stroke.width,
        o: stroke.opacity,
        m: stroke.mirror,
        e: stroke.emoji,
        ti: stroke.tip || '',
        l: layerId,
        pts: pendingRef.current,
      });
      pendingRef.current = [];
    }, 60);
  };

  const start = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const layerId = activeIdRef.current;
    const layer = findLayer(layerId);
    if (!layer || layer.hidden) return;
    const point = toPoint(event);
    const wasStencil = tool === 'stencil';
    const stroke = {
      tool,
      color,
      width: wasStencil ? stencilSize : width,
      opacity,
      mirror,
      emoji: wasStencil ? stencilKey(stencilId, stencilFilled) : stamp,
      tip: tipId,
      points: [point],
      a: seat,
      q: seqRef.current + 1,
    };
    seqRef.current += 1;
    activeRef.current = { stroke, layerId };
    pendingRef.current = [];
    try {
      wrapRef.current.setPointerCapture(event.pointerId);
    } catch (error) {
      // pointer capture is unavailable in some embedded browsers
    }
    if (tool === 'fill') {
      const ctx = layerCanvas(layerId).getContext('2d');
      mirroredPoints(point, mirror).forEach((spot) => fillRegion(ctx, spot, color, opacity));
      scheduleComposite();
    } else if (wasStencil) {
      const ctx = layerCanvas(layerId).getContext('2d');
      mirroredPoints(point, mirror).forEach((spot) => paintStencil(ctx, stroke, spot));
      scheduleComposite();
    } else if (SHAPE_TOOLS.includes(tool)) {
      repaintLayer(layer, stroke);
    } else {
      paintLive(layerCanvas(layerId).getContext('2d'), stroke, point, null);
      scheduleComposite();
    }
    send({
      type: 'draw',
      t: tool,
      c: color,
      w: stroke.width,
      o: opacity,
      m: mirror,
      e: stroke.emoji,
      ti: stroke.tip || '',
      l: layerId,
      pts: [point],
      start: true,
    });
  };

  const move = (event) => {
    const point = toPoint(event);
    send({ type: 'cursor', x: point[0], y: point[1], active: true });
    const active = activeRef.current;
    if (!active) return;
    const stroke = active.stroke;
    const layer = findLayer(active.layerId);
    if (!layer) return;
    if (stroke.tool === 'fill' || stroke.tool === 'stencil') return;
    const previous = stroke.points[stroke.points.length - 1];
    if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 2) return;
    if (SHAPE_TOOLS.includes(stroke.tool)) {
      stroke.points[1] = point;
      repaintLayer(layer, stroke);
      return;
    }
    paintLive(layerCanvas(active.layerId).getContext('2d'), stroke, point, previous);
    scheduleComposite();
    stroke.points.push(point);
    pendingRef.current.push(point);
    flush();
  };

  const end = () => {
    const active = activeRef.current;
    if (!active) return;
    activeRef.current = null;
    const { stroke, layerId } = active;
    const layer = findLayer(layerId);
    window.clearTimeout(flushRef.current);
    flushRef.current = null;
    send({ type: 'cursor', x: 0, y: 0, active: false });
    if (!layer || !stroke.points.length) {
      pendingRef.current = [];
      return;
    }
    const tail = pendingRef.current.length
      ? pendingRef.current
      : [stroke.points[stroke.points.length - 1]];
    send({
      type: 'draw',
      t: stroke.tool,
      c: stroke.color,
      w: stroke.width,
      o: stroke.opacity,
      m: stroke.mirror,
      e: stroke.emoji,
      ti: stroke.tip || '',
      l: layerId,
      pts: tail,
      end: true,
    });
    pendingRef.current = [];
    layer.strokes.push(stroke);
    const total = layersRef.current.reduce((count, item) => count + item.strokes.length, 0);
    if (total > MAX_STROKES) {
      applyLayers(trimLayers(layersRef.current));
      repaintAll();
    } else {
      setLayers((previous) => [...previous]);
    }
    scheduleSave();
    refreshHistory();
  };

  const undo = () => {
    const mine = [];
    layersRef.current.forEach((layer) => {
      layer.strokes.forEach((stroke, index) => {
        if (stroke.a === seat) mine.push({ layer, index, stroke });
      });
    });
    if (!mine.length) return;
    const last = mine.reduce((a, b) => (b.stroke.q >= a.stroke.q ? b : a));
    last.layer.strokes.splice(last.index, 1);
    redoRef.current.push({ layerId: last.layer.id, stroke: last.stroke });
    repaintLayer(last.layer);
    setLayers((previous) => [...previous]);
    syncNow();
    refreshHistory();
  };

  const redo = () => {
    const entry = redoRef.current.pop();
    if (!entry) return;
    const layer = findLayer(entry.layerId) || layersRef.current[0];
    layer.strokes.push(entry.stroke);
    repaintLayer(layer);
    setLayers((previous) => [...previous]);
    syncNow();
    refreshHistory();
  };

  const clear = () => {
    applyLayers(layersRef.current.map((layer) => ({ ...layer, strokes: [] })));
    remoteRef.current.clear();
    redoRef.current = [];
    repaintAll();
    send({ type: 'clear' });
    syncNow();
    refreshHistory();
  };

  const selectLayer = (id) => {
    activeIdRef.current = id;
    setActiveId(id);
  };

  const addLayer = () => {
    if (layersRef.current.length >= MAX_LAYERS) return;
    const layer = makeLayer(`Layer ${layersRef.current.length + 1}`);
    applyLayers([...layersRef.current, layer]);
    selectLayer(layer.id);
    scheduleComposite();
    syncNow();
  };

  const removeLayer = (id) => {
    if (layersRef.current.length === 1) return;
    const next = layersRef.current.filter((layer) => layer.id !== id);
    applyLayers(next);
    layerCanvases.current.delete(id);
    if (activeIdRef.current === id) selectLayer(next[next.length - 1].id);
    scheduleComposite();
    syncNow();
  };

  const renameLayer = (id, name) => {
    applyLayers(
      layersRef.current.map((layer) => (layer.id === id ? { ...layer, name } : layer))
    );
    syncNow();
  };

  const moveLayer = (id, direction) => {
    const list = [...layersRef.current];
    const index = list.findIndex((layer) => layer.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    applyLayers(list);
    scheduleComposite();
    syncNow();
  };

  const toggleLayer = (id) => {
    applyLayers(
      layersRef.current.map((layer) =>
        layer.id === id ? { ...layer, hidden: !layer.hidden } : layer
      )
    );
    scheduleComposite();
    scheduleSave();
  };

  const setLayerOpacity = (id, value) => {
    applyLayers(
      layersRef.current.map((layer) => (layer.id === id ? { ...layer, opacity: value } : layer))
    );
    scheduleComposite();
    scheduleSave();
  };

  const chooseTool = (id) => {
    setTool(id);
    const found = TOOLS.find((item) => item.id === id);
    if (found) setWidth(found.size);
  };

  const pickStencil = (id) => {
    setStencilId(id);
    setTool('stencil');
  };

  const pickPaper = (value) => {
    setBg(value);
    window.clearTimeout(paperRef.current);
    paperRef.current = window.setTimeout(() => {
      send({ type: 'bg', c: value });
      scheduleSave();
    }, 260);
  };

  const pickTip = (id) => {
    setTipId(id);
    if (!TIP_TOOLS.includes(tool)) setTool('pen');
  };

  const addTexture = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const record = await base44.entities.BrushTip.create({
        space_id: space.id,
        name: (file.name || 'My texture').replace(/\.[^.]+$/, '').slice(0, 40),
        file_uri,
        added_by_name: user?.full_name || '',
        added_by_id: user?.id || '',
      });
      const id = `custom:${record.id}`;
      await registerTexture(id, await signFile(file_uri));
      setTextures((previous) => [...previous, { id, name: record.name }]);
      pickTip(id);
      send({ type: 'tips' });
    } finally {
      setUploading(false);
    }
  };

  const saveToDevice = () => {
    const out = document.createElement('canvas');
    out.width = CANVAS_WIDTH;
    out.height = heightRef.current;
    const ctx = out.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, heightRef.current);
    layersRef.current.forEach((layer) => {
      if (layer.hidden) return;
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.drawImage(layerCanvas(layer.id), 0, 0);
    });
    ctx.globalAlpha = 1;
    const link = document.createElement('a');
    link.href = out.toDataURL('image/png');
    link.download = `savespace-canvas-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="glass-card rounded-3xl p-3 shadow-soft sm:p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="font-heading text-sm font-semibold tracking-tight text-white">
          Drawing together
        </h3>
        {peerCursor ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-medium text-fuchsia-200">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300 animate-pulse-soft" />
            {peerCursor.name} is drawing
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Same page, both of you</span>
        )}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        <div className="min-w-0 flex-1">
          <CanvasToolbar
            tool={tool}
            onTool={chooseTool}
            mirror={mirror}
            onMirror={setMirror}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onSave={saveToDevice}
            onClear={clear}
            stencilId={stencilId}
            onStencil={pickStencil}
            stencilFilled={stencilFilled}
            onStencilFilled={setStencilFilled}
            tall={tall}
            onTall={() => setTall((previous) => !previous)}
          />

          <div
            ref={wrapRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={end}
            style={{ backgroundColor: bg }}
            className="relative mt-2 touch-none overflow-hidden rounded-2xl border border-white/6 bg-[radial-gradient(rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:22px_22px]"
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={tall ? CANVAS_HEIGHT + EXTRA_HEIGHT : CANVAS_HEIGHT}
              className="block h-auto w-full"
            />

            {peerCursor && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                style={{
                  left: `${(peerCursor.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(peerCursor.y / heightRef.current) * 100}%`,
                }}
              >
                <span className="block h-2.5 w-2.5 rounded-full bg-fuchsia-400" />
                <span className="mt-1 block whitespace-nowrap rounded-full bg-fuchsia-400/25 px-2 py-0.5 text-[10px] font-medium text-fuchsia-100">
                  {peerCursor.name}
                </span>
              </div>
            )}
          </div>

          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            {tool === 'stencil'
              ? `${findStencil(stencilId).label} stencil`
              : TOOLS.find((item) => item.id === tool)?.label}{' '}
            ·{' '}
            {mirror === 'off' ? 'no mirror' : `mirror ${mirror === 'quad' ? 'four ways' : mirror === 'v' ? 'left/right' : 'top/bottom'}`} · saves itself as you go
          </p>
        </div>

        <aside className="w-full space-y-2 xl:w-64">
          <CanvasBrushPanel
            color={color}
            onColor={setColor}
            width={width}
            onWidth={setWidth}
            opacity={opacity}
            onOpacity={setOpacity}
            stamp={stamp}
            onStamp={setStamp}
            showStamps={tool === 'stamp'}
            stencilSize={stencilSize}
            onStencilSize={setStencilSize}
            showStencils={tool === 'stencil'}
            tipId={tipId}
            onTip={pickTip}
            textures={textures}
            onUpload={addTexture}
            uploading={uploading}
            showTips={TIP_TOOLS.includes(tool)}
          />
          <CanvasPaper value={bg} onChange={pickPaper} />
          <CanvasLayers
            layers={layers}
            activeId={activeId}
            onSelect={selectLayer}
            onAdd={addLayer}
            onRemove={removeLayer}
            onMove={moveLayer}
            onToggle={toggleLayer}
            onOpacity={setLayerOpacity}
            onRename={renameLayer}
          />
        </aside>
      </div>
    </section>
  );
}