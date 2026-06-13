'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';
import CountUp from './CountUp';

export interface BurnStats {
  mint: string;
  initialSupply: number;
  currentSupply: number;
  burned: number;
  burnedPct: number;
  updatedAt: number;
}

export default function BurnClient({ initial }: { initial: BurnStats | null }) {
  const [stats, setStats] = useState<BurnStats | null>(initial);

  useEffect(() => {
    const load = () =>
      fetch(`${API_BASE}/burn`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => j && setStats(j))
        .catch(() => {});
    if (!initial) load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [initial]);

  const burned = stats?.burned ?? 0;
  const pct = stats?.burnedPct ?? 0;

  return (
    <div
      className="panel"
      style={{
        padding: 'clamp(28px, 5vw, 52px)',
        textAlign: 'center',
        background:
          'radial-gradient(120% 150% at 50% 0%, rgba(229,53,43,0.10), transparent 60%), var(--color-bg-1)',
      }}
    >
      <div className="eyebrow" style={{ color: 'var(--red)' }}>🔥 burned to date</div>
      <div
        className="mono tnum"
        style={{
          fontSize: 'clamp(40px, 8vw, 84px)',
          fontWeight: 700,
          color: 'var(--ink-0)',
          marginTop: 14,
          lineHeight: 1,
        }}
      >
        <CountUp value={Math.floor(burned)} />
      </div>
      <div className="mono" style={{ color: 'var(--ink-2)', marginTop: 10, fontSize: 14 }}>
        $NEURONS · {pct.toFixed(4)}% of total supply
      </div>

      {/* supply bar */}
      <div
        style={{
          marginTop: 28,
          height: 10,
          borderRadius: 99,
          background: 'var(--bg-3)',
          overflow: 'hidden',
          border: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            width: `${Math.max(0.4, Math.min(100, pct))}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--red), var(--amber))',
            transition: 'width 1s ease',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 10,
          fontSize: 12,
        }}
        className="mono"
      >
        <span style={{ color: 'var(--ink-3)' }}>
          live supply · {stats ? Math.floor(stats.currentSupply).toLocaleString() : '…'}
        </span>
        <span style={{ color: 'var(--ink-3)' }}>
          initial · {stats ? stats.initialSupply.toLocaleString() : '1,000,000,000'}
        </span>
      </div>
    </div>
  );
}
