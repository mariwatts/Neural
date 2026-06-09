import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

export default function CategoryGrid({
  counts = {},
}: {
  counts?: Record<string, number>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 14,
      }}
    >
      {CATEGORIES.filter((c) => c.key !== 'base').map((c) => (
        <Link
          key={c.key}
          href={`/explore?category=${c.key}`}
          data-hot
          className="panel panel-hover"
          style={{ padding: 18, display: 'block' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: 22,
                color: c.color,
                width: 38,
                height: 38,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 9,
                border: '1px solid var(--line)',
                background: 'var(--bg-2)',
              }}
            >
              {c.glyph}
            </span>
            {counts[c.key] != null && (
              <span className="mono tnum" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                {counts[c.key]}
              </span>
            )}
          </div>
          <div className="mono" style={{ marginTop: 14, fontSize: 14, color: 'var(--ink-0)' }}>
            {c.tld}
          </div>
          <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {c.blurb}
          </div>
        </Link>
      ))}
    </div>
  );
}
