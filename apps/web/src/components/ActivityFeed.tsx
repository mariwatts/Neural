'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ACTIVITY_GLYPH, ACTIVITY_LABEL, short, timeAgo } from '@/lib/format';
import { categoryMeta } from '@/lib/categories';
import type { ActivityEvent } from '@/lib/types';
import Handle from './Handle';

export default function ActivityFeed({
  initial = [],
  limit = 18,
  pollMs = 3500,
  title = 'Live activity',
}: {
  initial?: ActivityEvent[];
  limit?: number;
  pollMs?: number;
  title?: string;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>(initial.slice(0, limit));
  const [live, setLive] = useState(true);
  const newest = useRef<number>(initial[0]?.timestamp ?? 0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stop = false;

    const poll = async () => {
      try {
        const next = await api.activity(limit, 'all');
        if (!stop && next.length) {
          newest.current = next[0].timestamp;
          setEvents(next);
          setLive(true);
        }
      } catch {
        if (!stop) setLive(false);
      } finally {
        if (!stop) timer = setTimeout(poll, pollMs);
      }
    };
    timer = setTimeout(poll, pollMs);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [limit, pollMs]);

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <span className="eyebrow">{title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="live-dot" style={{ opacity: live ? 1 : 0.3 }} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
            {live ? 'streaming' : 'offline'}
          </span>
        </span>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {events.map((e, i) => {
          const cat = categoryMeta(e.category);
          return (
            <li
              key={e.id}
              className={i === 0 ? 'feed-enter' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 16px',
                borderBottom: i === events.length - 1 ? 'none' : '1px solid rgba(35,42,48,0.5)',
              }}
            >
              <span
                className="mono"
                style={{
                  width: 22,
                  textAlign: 'center',
                  color: cat.color,
                  fontSize: 13,
                  flexShrink: 0,
                }}
                title={e.type}
              >
                {ACTIVITY_GLYPH[e.type] ?? '·'}
              </span>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/agent/${e.name}`} data-hot style={{ minWidth: 0 }}>
                    <Handle name={e.name} size={13} />
                  </Link>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                    {ACTIVITY_LABEL[e.type] ?? e.type}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>
                  {short(e.actor, 4, 4)}
                  {e.counterparty ? ` → ${short(e.counterparty, 4, 4)}` : ''}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {e.amountSol ? (
                  <div className="mono tnum" style={{ fontSize: 12, color: 'var(--accent-bright)' }}>
                    {e.amountSol >= 0.001 ? e.amountSol.toFixed(e.amountSol < 1 ? 3 : 2) : '<0.001'} ◎
                  </div>
                ) : null}
                <div className="mono" suppressHydrationWarning style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                  {timeAgo(e.timestamp)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
