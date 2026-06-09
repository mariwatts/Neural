'use client';

import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  pulse: number;
  c: string; // "r,g,b"
}

const NODE_COLORS = ['229,53,43', '31,91,230', '47,168,85']; // red / blue / green

/**
 * The signature backdrop: a slow, living neural-net field — nodes (agents)
 * drifting and linking to nearby nodes (resolution edges), with the occasional
 * synaptic pulse travelling an edge. Pointer gently warps the nearest nodes.
 * Pure canvas, capped DPR, paused when tab is hidden → cheap and smooth.
 */
export default function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    const pointer = { x: -9999, y: -9999 };
    const LINK_DIST = 150;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = Math.min(96, Math.floor((w * h) / 17000));
      nodes = Array.from({ length: density }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.6 + 0.7,
        pulse: Math.random(),
        c: NODE_COLORS[i % NODE_COLORS.length],
      }));
    };

    let raf = 0;
    let running = true;

    const step = () => {
      ctx.clearRect(0, 0, w, h);

      // edge colour follows the theme (dark links on light, light links on dark)
      const edgeRGB =
        document.documentElement.getAttribute('data-theme') === 'dark'
          ? '255, 255, 255'
          : '12, 12, 13';

      // edges
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / LINK_DIST) * 0.14;
            ctx.strokeStyle = `rgba(${edgeRGB}, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx;
          n.y += n.vy;
          // pointer warp
          const pdx = n.x - pointer.x;
          const pdy = n.y - pointer.y;
          const pd2 = pdx * pdx + pdy * pdy;
          if (pd2 < 120 * 120) {
            const f = (1 - Math.sqrt(pd2) / 120) * 0.6;
            n.x += (pdx / (Math.sqrt(pd2) || 1)) * f;
            n.y += (pdy / (Math.sqrt(pd2) || 1)) * f;
          }
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          n.x = Math.max(0, Math.min(w, n.x));
          n.y = Math.max(0, Math.min(h, n.y));
          n.pulse += 0.006;
        }
        const glow = 0.45 + Math.sin(n.pulse * Math.PI * 2) * 0.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.c}, ${glow})`;
        ctx.fill();
      }

      if (running) raf = requestAnimationFrame(step);
    };

    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <>
      <div className="backdrop" aria-hidden />
      <canvas ref={canvasRef} className="neural-canvas" aria-hidden />
      <div className="grain" aria-hidden />
    </>
  );
}
