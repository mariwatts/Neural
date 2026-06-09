'use client';

import { useId } from 'react';
import type { TimelinePoint } from '@/lib/types';

/** Lightweight hand-rolled SVG area chart for the registrations timeline. */
export function AreaChart({
  data,
  height = 220,
  metric = 'count',
}: {
  data: TimelinePoint[];
  height?: number;
  metric?: 'count' | 'volume';
}) {
  const id = useId().replace(/:/g, '');
  const w = 900;
  const h = height;
  const pad = { t: 14, r: 8, b: 22, l: 8 };
  const vals = data.map((d) => (metric === 'count' ? d.count : d.volume));
  const max = Math.max(1, ...vals);
  const n = data.length;
  const xstep = (w - pad.l - pad.r) / Math.max(1, n - 1);

  const pts = vals.map((v, i) => {
    const x = pad.l + i * xstep;
    const y = pad.t + (1 - v / max) * (h - pad.t - pad.b);
    return [x, y] as const;
  });

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1]?.[0].toFixed(1)},${h - pad.b} L${pts[0]?.[0].toFixed(1)},${h - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f5be6" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1f5be6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + g * (h - pad.t - pad.b)}
          y2={pad.t + g * (h - pad.t - pad.b)}
          stroke="#d8d4c8"
          strokeDasharray="2 4"
        />
      ))}
      {pts.length > 0 && (
        <>
          <path d={area} fill={`url(#grad-${id})`} />
          <path d={line} fill="none" stroke="#1f5be6" strokeWidth="2" />
          {pts.length > 0 && (
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill="#1f5be6" />
          )}
        </>
      )}
    </svg>
  );
}

/** Horizontal distribution bars (category / tier breakdown). */
export function BarList({
  data,
  colorOf,
}: {
  data: { label: string; value: number; color?: string }[];
  colorOf?: (label: string) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 48px', gap: 12, alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-1)' }}>
            {d.label}
          </span>
          <span style={{ height: 8, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${(d.value / max) * 100}%`,
                background: d.color ?? colorOf?.(d.label) ?? 'var(--accent)',
                borderRadius: 99,
                transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </span>
          <span className="mono tnum" style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}
