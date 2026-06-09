import Link from 'next/link';
import type { NameRecord } from '@/lib/types';
import { categoryMeta } from '@/lib/categories';
import { compact, rep } from '@/lib/format';
import Handle from './Handle';
import AgentAvatar from './AgentAvatar';

export default function Leaderboard({ records }: { records: NameRecord[] }) {
  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr auto auto',
          gap: 12,
          padding: '12px 18px',
          borderBottom: '1px solid var(--line)',
        }}
        className="eyebrow"
      >
        <span>#</span>
        <span>Agent</span>
        <span style={{ textAlign: 'right' }}>Rep</span>
        <span style={{ textAlign: 'right', minWidth: 64 }}>Tasks</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {records.map((r, i) => {
          const cat = categoryMeta(r.category);
          return (
            <li key={r.name}>
              <Link
                href={`/agent/${r.name}`}
                data-hot
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 18px',
                  borderBottom: i === records.length - 1 ? 'none' : '1px solid rgba(35,42,48,0.5)',
                }}
                className="lb-row"
              >
                <span
                  className="mono tnum"
                  style={{ color: i < 3 ? 'var(--accent-bright)' : 'var(--ink-2)', fontSize: 13 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <AgentAvatar seed={r.card.avatarSeed} category={r.category} size={26} rounded={7} />
                  <span style={{ minWidth: 0 }}>
                    <Handle name={r.name} size={13} />
                    <span
                      className="mono"
                      style={{ display: 'block', fontSize: 10, color: cat.color, marginTop: 2 }}
                    >
                      {cat.label}
                    </span>
                  </span>
                </span>
                <span className="mono tnum" style={{ textAlign: 'right', color: 'var(--accent-bright)', fontSize: 13 }}>
                  {rep(r.card.reputationScore)}
                </span>
                <span className="mono tnum" style={{ textAlign: 'right', color: 'var(--ink-1)', fontSize: 13, minWidth: 64 }}>
                  {compact(r.tasksServed)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
