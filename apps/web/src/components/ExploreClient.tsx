'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import type { ExploreResult } from '@/lib/types';
import AgentGridCard from './AgentGridCard';

const SORTS: { key: string; label: string }[] = [
  { key: 'recent', label: 'Newest' },
  { key: 'reputation', label: 'Reputation' },
  { key: 'tasks', label: 'Most active' },
  { key: 'alpha', label: 'A–Z' },
];

const TIERS = ['all', 'premium', 'standard', 'accessible'];

export default function ExploreClient({
  initial,
}: {
  initial: {
    q: string;
    category: string;
    tier: string;
    verified: boolean;
    sort: string;
  };
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [tier, setTier] = useState(initial.tier);
  const [verified, setVerified] = useState(initial.verified);
  const [sort, setSort] = useState(initial.sort);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ExploreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  // reset to page 1 on filter change
  useEffect(() => setPage(1), [q, category, tier, verified, sort]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await api.explore({
          q,
          category,
          tier,
          verified: verified ? 'true' : undefined,
          sort,
          page,
          pageSize: 24,
        });
        setData(res);
        // sync URL (shallow)
        const sp = new URLSearchParams();
        if (q) sp.set('q', q);
        if (category !== 'all') sp.set('category', category);
        if (tier !== 'all') sp.set('tier', tier);
        if (verified) sp.set('verified', 'true');
        if (sort !== 'recent') sp.set('sort', sort);
        router.replace(`/explore${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
      } finally {
        setLoading(false);
      }
    }, q ? 240 : 0);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, tier, verified, sort, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      {/* search */}
      <div
        className="panel"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 4px 16px', marginBottom: 16 }}
      >
        <span style={{ color: 'var(--ink-2)' }}>⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search names, capabilities, owners…"
          spellCheck={false}
          className="mono"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--ink-0)',
            fontSize: 15,
            height: 46,
          }}
        />
        <button
          onClick={() => setVerified((v) => !v)}
          data-hot
          className={`chip ${verified ? 'chip-active' : ''}`}
          style={{ cursor: 'pointer', height: 32 }}
        >
          ✓ verified
        </button>
      </div>

      {/* filter row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button
          onClick={() => setCategory('all')}
          data-hot
          className={`chip ${category === 'all' ? 'chip-active' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          all
        </button>
        {CATEGORIES.filter((c) => c.key !== 'base').map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            data-hot
            className={`chip ${category === c.key ? 'chip-active' : ''}`}
            style={{ cursor: 'pointer', color: category === c.key ? undefined : c.color }}
          >
            {c.glyph} {c.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '14px 0 18px',
        }}
      >
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          {data ? `${data.total.toLocaleString()} agents` : 'loading…'}
          {loading && data ? ' · updating' : ''}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="eyebrow">sort</span>
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              data-hot
              className={`chip ${sort === s.key ? 'chip-active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* tier sub-filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            data-hot
            className={`chip ${tier === t ? 'chip-active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            {t === 'all' ? 'all tiers' : t}
          </button>
        ))}
      </div>

      {/* grid */}
      {data && data.items.length === 0 ? (
        <div className="panel" style={{ padding: 56, textAlign: 'center', color: 'var(--ink-2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>◇</div>
          No agents match these filters.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
            opacity: loading && !data ? 0.5 : 1,
          }}
        >
          {(data?.items ?? []).map((rec) => (
            <AgentGridCard key={rec.name} rec={rec} />
          ))}
        </div>
      )}

      {/* pagination */}
      {data && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 30 }}>
          <button
            className="btn btn-ghost"
            style={{ height: 38 }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            data-hot
          >
            ← prev
          </button>
          <span className="mono" style={{ fontSize: 13, color: 'var(--ink-1)' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost"
            style={{ height: 38 }}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            data-hot
          >
            next →
          </button>
        </div>
      )}
    </>
  );
}
