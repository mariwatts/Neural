'use client';

import { useEffect, useRef } from 'react';

/**
 * SpiderCursor — the site backdrop: two "spider" agents whose web anchors to a
 * field of points and whose hub follows the pointer. Adapted for NEURONS:
 * transparent canvas over the themed gradient + grain, ink/accent colours that
 * follow the light/dark theme live, DPR-aware, paused when the tab is hidden.
 */

interface WebPt {
  x: number;
  y: number;
  len: number;
  r: number;
}

// rgb triplets matched to the design tokens in globals.css
const THEME = {
  light: { ink: '12, 12, 13', accent: '31, 91, 230' },
  dark: { ink: '243, 244, 246', accent: '79, 134, 255' },
};

export function SpiderCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { sin, cos, PI, hypot, min, max } = Math;

    let w = 0;
    let h = 0;

    const colors = () =>
      document.documentElement.getAttribute('data-theme') === 'dark'
        ? THEME.dark
        : THEME.light;

    function rnd(x = 1, dx = 0) {
      return Math.random() * x + dx;
    }

    function many<T>(n: number, f: (i: number) => T): T[] {
      return [...Array(n)].map((_, i) => f(i));
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    function noise(x: number, y: number, t = 101) {
      const w0 = sin(0.3 * x + 1.4 * t + 2.0 + 2.5 * sin(0.4 * y + -1.3 * t + 1.0));
      const w1 = sin(0.2 * y + 1.5 * t + 2.8 + 2.3 * sin(0.5 * x + -1.2 * t + 0.5));
      return w0 + w1;
    }

    function drawCircle(x: number, y: number, r: number) {
      ctx!.beginPath();
      ctx!.ellipse(x, y, r, r, 0, 0, PI * 2);
      ctx!.fill();
    }

    function drawLine(x0: number, y0: number, x1: number, y1: number) {
      ctx!.beginPath();
      ctx!.moveTo(x0, y0);
      many(100, (i) => {
        i = (i + 1) / 100;
        const x = lerp(x0, x1, i);
        const y = lerp(y0, y1, i);
        const k = noise(x / 5 + x0, y / 5 + y0) * 2;
        ctx!.lineTo(x + k, y + k);
      });
      ctx!.stroke();
    }

    function spawn() {
      const pts: WebPt[] = many(333, () => ({
        x: rnd(window.innerWidth),
        y: rnd(window.innerHeight),
        len: 0,
        r: 0,
      }));

      const pts2 = many(9, (i) => ({
        x: cos((i / 9) * PI * 2),
        y: sin((i / 9) * PI * 2),
      }));

      const seed = rnd(100);
      let tx = rnd(window.innerWidth);
      let ty = rnd(window.innerHeight);
      let x = rnd(window.innerWidth);
      let y = rnd(window.innerHeight);
      const kx = rnd(0.5, 0.5);
      const ky = rnd(0.5, 0.5);
      const walkRadius = { x: rnd(50, 50), y: rnd(50, 50) };
      const r = window.innerWidth / rnd(100, 150);

      function paintPt(pt: WebPt, ink: string, accent: string) {
        if (pt.len) {
          ctx!.strokeStyle = `rgba(${ink}, 0.55)`;
          pts2.forEach((pt2) => {
            drawLine(
              lerp(x + pt2.x * r, pt.x, pt.len * pt.len),
              lerp(y + pt2.y * r, pt.y, pt.len * pt.len),
              x + pt2.x * r,
              y + pt2.y * r,
            );
          });
        }
        // active anchors glow in accent, the resting field stays in quiet ink
        ctx!.fillStyle = pt.len ? `rgba(${accent}, 0.9)` : `rgba(${ink}, 0.55)`;
        drawCircle(pt.x, pt.y, pt.r);
      }

      function paintHub(accent: string) {
        // the spider body: a ring of joints the legs radiate from
        ctx!.fillStyle = `rgba(${accent}, 0.9)`;
        pts2.forEach((pt2) => drawCircle(x + pt2.x * r, y + pt2.y * r, 1.6));
        drawCircle(x, y, 2.4);
      }

      return {
        follow(fx: number, fy: number) {
          tx = fx;
          ty = fy;
        },

        tick(t: number) {
          const { ink, accent } = colors();
          const selfMoveX = cos(t * kx + seed) * walkRadius.x;
          const selfMoveY = sin(t * ky + seed) * walkRadius.y;
          const fx = tx + selfMoveX;
          const fy = ty + selfMoveY;

          x += min(window.innerWidth / 100, (fx - x) / 10);
          y += min(window.innerWidth / 100, (fy - y) / 10);

          let i = 0;
          pts.forEach((pt) => {
            const dx = pt.x - x;
            const dy = pt.y - y;
            const len = hypot(dx, dy);
            let pr = min(2.4, window.innerWidth / len / 4);
            const increasing = len < window.innerWidth / 10 && i++ < 8;
            const dir = increasing ? 0.1 : -0.1;
            if (increasing) pr *= 1.5;
            pt.r = pr;
            pt.len = max(0, min(pt.len + dir, 1));
            paintPt(pt, ink, accent);
          });
          paintHub(accent);
        },
      };
    }

    const spiders = many(2, spawn);

    const onPointerMove = (e: PointerEvent) => {
      spiders.forEach((s) => s.follow(e.clientX, e.clientY));
    };

    let raf = 0;
    let running = true;

    function frame(t: number) {
      if (w !== window.innerWidth) w = canvas!.width = window.innerWidth;
      if (h !== window.innerHeight) h = canvas!.height = window.innerHeight;
      ctx!.clearRect(0, 0, w, h);
      ctx!.lineWidth = 1.2;
      spiders.forEach((s) => s.tick(t / 1000));
      if (running && !reduced) raf = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <>
      {/* themed gradient + film grain from the design system */}
      <div className="backdrop" aria-hidden />
      <canvas ref={canvasRef} className="neural-canvas" aria-hidden />
      <div className="grain" aria-hidden />
    </>
  );
}

export default SpiderCursor;
