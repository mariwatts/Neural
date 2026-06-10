'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { categoryMeta } from '@/lib/categories';
import type { ProtocolStats, TimelinePoint } from '@/lib/types';
import CountUp from './CountUp';
import { AreaChart, BarList } from './MiniChart';

export default function StatsClient({
  initialStats,
  initialTimeline,
}: {
  initialStats: ProtocolStats | null;
  initialTimeline: TimelinePoint[];
}) {
  const [stats, setStats] = useState<ProtocolStats | null>(initialStats);
  const [timeline] = useState<TimelinePoint[]>(initialTimeline);
  const [metric, setMetric] = useState<'count' | 'volume'>('count');

  useEffect(() => {
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const s = await api.stats();
        if (!stop) setStats(s);
      } catch {
        /* keep */
      } finally {
        if (!stop) t = setTimeout(poll, 5000);
      }
    };
    t = setTimeout(poll, 5000);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, []);

  const catData = Object.entries(stats?.registrationsByCategory ?? {})
    .map(([k, v]) => ({ label: categoryMeta(k).label, value: v, color: categoryMeta(k).color }))
    .sort((a, b) => b.value - a.value);

  const tierData = [
    { label: 'premium', value: stats?.registrationsByTier.premium ?? 0, color: '#1f5be6' },
    { label: 'standard', value: stats?.registrationsByTier.standard ?? 0, color: '#2fa855' },
    { label: 'accessible', value: stats?.registrationsByTier.accessible ?? 0, color: '#e5352b' },
  ];

  const econ = [
    { k: 'Treasury · 40%', v: stats?.treasurySol ?? 0, c: 'var(--accent)' },
    { k: 'Stakers · 30%', v: stats?.stakersSol ?? 0, c: 'var(--accent-dim)' },
    { k: 'Burned · 25%', v: stats?.feesBurnedSol ?? 0, c: 'var(--amber)' },
  ];
  const totalSplit = econ.reduce((s, e) => s + e.v, 0) || 1;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* metric tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Tile label="Total names" node={<CountUp value={stats?.totalNames ?? 0} />} />
        <Tile label="Verified agents" node={<CountUp value={stats?.verifiedAgents ?? 0} />} />
        <Tile label="Tasks served" node={<CountUp value={stats?.tasksServed ?? 0} />} />
        <Tile label="Active categories" node={<CountUp value={stats?.categories ?? 0} />} />
      </div>

      {/* chart */}
      <div className="panel" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span className="eyebrow">Last 30 days</span>
            <h3 style={{ fontSize: 20, marginTop: 8 }}>
              {metric === 'count' ? 'Registrations' : 'Registration volume'}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setMetric('count')} data-hot className={`chip ${metric === 'count' ? 'chip-active' : ''}`} style={{ cursor: 'pointer' }}>names</button>
            <button onClick={() => setMetric('volume')} data-hot className={`chip ${metric === 'volume' ? 'chip-active' : ''}`} style={{ cursor: 'pointer' }}>◎ volume</button>
          </div>
        </div>
        <AreaChart data={timeline} metric={metric} height={240} />
      </div>

      {/* breakdowns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        <div className="panel" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>Names by category</div>
          <BarList data={catData} />
        </div>
        <div className="panel" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>Names by tier</div>
          <BarList data={tierData} />
        </div>
      </div>

      {/* economics */}
      <div className="panel" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div className="eyebrow">Protocol economics</div>
          <div className="mono tnum" style={{ fontSize: 22, color: 'var(--accent-bright)' }}>
            <CountUp value={stats?.volumeSol ?? 0} decimals={1} suffix=" ◎" />{' '}
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>gross volume</span>
          </div>
        </div>
        {/* split bar */}
        <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', margin: '18px 0', border: '1px solid var(--line)' }}>
          {econ.map((e) => (
            <span key={e.k} style={{ width: `${(e.v / totalSplit) * 100}%`, background: e.c }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14 }}>
          {econ.map((e) => (
            <div key={e.k}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: e.c }} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{e.k}</span>
              </div>
              <div className="mono tnum" style={{ fontSize: 19, marginTop: 6 }}>
                <CountUp value={e.v} decimals={1} suffix=" ◎" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, node }: { label: string; node: React.ReactNode }) {
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div className="mono" style={{ fontSize: 'clamp(24px,3vw,32px)', fontWeight: 500 }}>{node}</div>
      <div className="eyebrow" style={{ marginTop: 8 }}>{label}</div>
    </div>
  );
}
