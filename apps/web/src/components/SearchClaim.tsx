'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import type { Availability } from '@/lib/types';

const SANITIZE = /[^a-z0-9-]/g;

export default function SearchClaim({
  autoFocus = false,
  initialLabel = '',
  initialCategory = 'base',
}: {
  autoFocus?: boolean;
  initialLabel?: string;
  initialCategory?: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(initialLabel);
  const [category, setCategory] = useState(initialCategory);
  const [state, setState] = useState<Availability | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking' | 'done' | 'error'>('idle');
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  const tld = useMemo(
    () => (category === 'base' ? '.agent' : `.${category}.agent`),
    [category],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const clean = label.trim().toLowerCase();
    if (!clean) {
      setState(null);
      setStatus('idle');
      return;
    }
    setStatus('checking');
    debounce.current = setTimeout(async () => {
      try {
        const res = await api.availability(clean, category === 'base' ? undefined : category);
        setState(res);
        setStatus('done');
      } catch {
        setStatus('error');
        setState(null);
      }
    }, 280);
  }, [label, category]);

  const fqn = state?.name ?? `${label.trim().toLowerCase()}${tld}`;
  const tooShort = label.trim().length === 0;

  const primary = () => {
    if (tooShort) return;
    if (state && !state.available) {
      router.push(`/agent/${fqn}`);
    } else {
      router.push(
        `/register?name=${encodeURIComponent(label.trim().toLowerCase())}&category=${category}`,
      );
    }
  };

  const badge = (() => {
    if (status === 'error') return { text: 'check failed', color: 'var(--err)' };
    if (tooShort) return { text: 'enter a name', color: 'var(--ink-2)' };
    if (status === 'checking') return { text: 'checking…', color: 'var(--ink-2)' };
    if (state?.available) return { text: 'available', color: 'var(--accent-bright)' };
    if (state && !state.available) return { text: 'taken', color: 'var(--amber)' };
    return { text: '', color: 'var(--ink-2)' };
  })();

  return (
    <div style={{ width: '100%' }}>
      {/* input well */}
      <div
        className="panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 8px 8px 18px',
          borderColor: state?.available ? 'var(--accent-dim)' : 'var(--line-bright)',
          boxShadow: state?.available ? '0 0 0 1px rgba(31,91,230,0.3)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', flex: 1, minWidth: 0 }}>
          <input
            autoFocus={autoFocus}
            value={label}
            onChange={(e) =>
              setLabel(e.target.value.toLowerCase().replace(SANITIZE, '').slice(0, 32))
            }
            onKeyDown={(e) => e.key === 'Enter' && primary()}
            placeholder="your-agent"
            spellCheck={false}
            className="mono"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--ink-0)',
              fontSize: 'clamp(18px, 3.2vw, 26px)',
              letterSpacing: '-0.01em',
            }}
          />
          <span
            className="mono"
            style={{
              color: 'var(--ink-2)',
              fontSize: 'clamp(15px, 2.6vw, 22px)',
              whiteSpace: 'nowrap',
            }}
          >
            {tld}
          </span>
        </span>

        <span
          className="mono"
          style={{
            fontSize: 11,
            color: badge.color,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {state?.available && <span className="live-dot" style={{ width: 6, height: 6 }} />}
          {badge.text}
        </span>

        <button className="btn btn-primary" onClick={primary} disabled={tooShort} data-hot>
          {state && !state.available ? 'View' : 'Register'}
        </button>
      </div>

      {/* meta row: price + tier + category chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
          flexWrap: 'wrap',
        }}
      >
        {state && status === 'done' && (
          <>
            <span className="chip chip-active">
              {state.tier} · {state.priceSol} ◎
            </span>
            <span className="chip">{state.permanent ? 'permanent' : '1-year, renewable'}</span>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%' }}>
          <button
            onClick={() => setCategory('base')}
            data-hot
            className={`chip ${category === 'base' ? 'chip-active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            base
          </button>
          {CATEGORIES.filter((c) => c.key !== 'base').slice(0, 6).map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              data-hot
              className={`chip ${category === c.key ? 'chip-active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              .{c.key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
