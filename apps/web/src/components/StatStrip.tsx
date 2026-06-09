'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ProtocolStats } from '@/lib/types';
import CountUp from './CountUp';

export default function StatStrip({ initial }: { initial: ProtocolStats | null }) {
  const [stats, setStats] = useState<ProtocolStats | null>(initial);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const s = await api.stats();
        if (!stop) setStats(s);
      } catch {
        /* keep last */
      } finally {
        if (!stop) timer = setTimeout(poll, 5000);
      }
    };
    timer = setTimeout(poll, 5000);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, []);

  const items: { label: string; node: React.ReactNode }[] = [
    {
      label: 'Agents registered',
      node: <CountUp value={stats?.totalNames ?? 0} />,
    },
    {
      label: 'Verified on-chain',
      node: <CountUp value={stats?.verifiedAgents ?? 0} />,
    },
    {
      label: 'Tasks served',
      node: <CountUp value={stats?.tasksServed ?? 0} />,
    },
    {
      label: 'Protocol volume (SOL)',
      node: <CountUp value={stats?.volumeSol ?? 0} decimals={1} />,
    },
  ];

  return (
    <div
      className="panel"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      }}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          style={{
            padding: '20px 22px',
            borderLeft: i === 0 ? 'none' : '1px solid var(--line)',
          }}
        >
          <div
            className="mono"
            style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--ink-0)', fontWeight: 500 }}
          >
            {it.node}
          </div>
          <div className="eyebrow" style={{ marginTop: 8 }}>
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
