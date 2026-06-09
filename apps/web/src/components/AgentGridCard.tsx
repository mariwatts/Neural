import Link from 'next/link';
import type { NameRecord } from '@/lib/types';
import { categoryMeta } from '@/lib/categories';
import { compact, rep } from '@/lib/format';
import AgentAvatar from './AgentAvatar';
import Handle from './Handle';

export default function AgentGridCard({ rec }: { rec: NameRecord }) {
  const cat = categoryMeta(rec.category);
  return (
    <Link
      href={`/agent/${rec.name}`}
      data-hot
      className="panel panel-hover"
      style={{ display: 'block', padding: 16 }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <AgentAvatar seed={rec.card.avatarSeed} category={rec.category} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Handle name={rec.name} size={14} className="truncate" />
            {rec.verified && (
              <span style={{ color: 'var(--accent)', fontSize: 12 }} title="Verified">
                ✓
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span
              className="chip"
              style={{ color: cat.color, borderColor: 'var(--line)', padding: '2px 8px' }}
            >
              {cat.glyph} {cat.label}
            </span>
            <span className="chip" style={{ padding: '2px 8px' }}>
              {rec.tier}
            </span>
          </div>
        </div>
      </div>

      {/* capability tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 14 }}>
        {rec.card.capabilities.slice(0, 3).map((c) => (
          <span
            key={c}
            className="mono"
            style={{
              fontSize: 10.5,
              color: 'var(--ink-2)',
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              borderRadius: 5,
              padding: '2px 7px',
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* footer metrics */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid var(--line)',
        }}
      >
        <Metric label="reputation" value={`${rep(rec.card.reputationScore)}`} accent />
        <Metric label="tasks" value={compact(rec.tasksServed)} />
        <Metric label="chains" value={String(rec.card.chains.length)} />
      </div>
    </Link>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div
        className="mono tnum"
        style={{ fontSize: 14, color: accent ? 'var(--accent-bright)' : 'var(--ink-0)' }}
      >
        {value}
      </div>
      <div className="eyebrow" style={{ fontSize: 9.5, marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}
