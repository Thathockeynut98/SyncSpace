import { useEffect, useRef } from 'react';
import { drawStencilShape } from '@/lib/canvasStencils';

export default function StencilPreview({ stencil, size = 34, color = '#e2e8f0' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const density = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * density);
    canvas.height = Math.round(size * density);
    ctx.setTransform(density, 0, 0, density, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    drawStencilShape(ctx, stencil, {
      size: size * 0.9,
      color,
      strokeWidth: 1.2,
    });
  }, [stencil, size, color]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}