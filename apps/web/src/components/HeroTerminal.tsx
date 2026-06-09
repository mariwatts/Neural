'use client';

import { useEffect, useRef, useState } from 'react';
import { short } from '@/lib/format';

export interface TerminalSample {
  name: string;
  owner: string;
  reputation: number;
  capabilities: string[];
  verified: boolean;
}

const FALLBACK: TerminalSample[] = [
  { name: 'scout.agent', owner: '7Z64LkKH8qK2u3rVQy9bXmA1pNcW4tThd6oFs2eJvLpQ', reputation: 9400, capabilities: ['web_search', 'extraction', 'summarization'], verified: true },
  { name: 'executor.defi.agent', owner: 'B9xPq2KdMn4Lr7vTcs1WgaY6zHpE3uXfJ8oR5tNbVqWd', reputation: 8800, capabilities: ['swap_routing', 'yield_optimization', 'mev_protection'], verified: true },
  { name: 'oracle.price.agent', owner: 'Dk3mPq9XrT2vN8wLcF1bGaH6yZuE4sJ7oR5tWnBqVpMx', reputation: 9100, capabilities: ['price_feed', 'twap_oracle', 'proof_of_reserve'], verified: true },
];

type Line = { text: string; tone?: 'cmd' | 'ok' | 'dim' | 'accent' | 'amber' };

export default function HeroTerminal({ samples = FALLBACK }: { samples?: TerminalSample[] }) {
  const data = samples.length ? samples : FALLBACK;
  const [lines, setLines] = useState<Line[]>([]);
  const [typed, setTyped] = useState('');
  const idx = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        const t = setTimeout(res, reduced ? Math.min(ms, 120) : ms);
        timers.current.push(t);
      });

    let cancelled = false;

    const typeCmd = async (cmd: string) => {
      setTyped('');
      if (reduced) {
        setTyped(cmd);
        return;
      }
      for (let i = 0; i <= cmd.length; i++) {
        if (cancelled) return;
        setTyped(cmd.slice(0, i));
        await wait(34 + Math.random() * 36);
      }
    };

    const run = async () => {
      while (!cancelled) {
        const s = data[idx.current % data.length];
        setLines([]);
        await typeCmd(`neurons resolve ${s.name}`);
        await wait(380);
        if (cancelled) return;

        const out: Line[] = [];
        const push = async (l: Line, d = 120) => {
          out.push(l);
          setLines([...out]);
          await wait(d);
        };
        await push({ text: '⠿ resolving via PDA…', tone: 'dim' }, 460);
        out.pop();
        await push({ text: `✓ resolved  ${s.name}`, tone: 'ok' }, 90);
        await push({ text: `  owner       ${short(s.owner, 6, 6)}`, tone: 'dim' }, 90);
        await push({
          text: `  reputation  ${(s.reputation / 100).toFixed(1)} / 100`,
          tone: 'accent',
        }, 90);
        await push({
          text: `  verified    ${s.verified ? 'true' : 'false'}`,
          tone: s.verified ? 'ok' : 'amber',
        }, 90);
        await push(
          { text: `  caps        [${s.capabilities.slice(0, 3).join(', ')}]`, tone: 'dim' },
          90,
        );
        await wait(2600);
        idx.current++;
      }
    };

    run();
    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toneColor: Record<string, string> = {
    cmd: 'var(--ink-0)',
    ok: 'var(--accent-bright)',
    dim: 'var(--ink-2)',
    accent: 'var(--accent)',
    amber: 'var(--amber)',
  };

  return (
    <div className="panel" style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px -40px rgba(0,0,0,0.55)' }}>
      {/* title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-2)',
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#2a3138' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#2a3138' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#2a3138' }} />
        <span className="mono" style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-2)' }}>
          neurons-cli · resolver
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" />
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>mainnet</span>
        </span>
      </div>

      {/* body */}
      <div
        className="mono"
        style={{
          padding: '16px 16px 20px',
          fontSize: 13,
          lineHeight: 1.75,
          flex: 1,
          minHeight: 232,
        }}
      >
        <div style={{ color: 'var(--ink-0)' }}>
          <span style={{ color: 'var(--accent)' }}>❯</span> {typed}
          <span className="blink" style={{ color: 'var(--accent)' }}>▋</span>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ color: toneColor[l.tone ?? 'dim'], whiteSpace: 'pre' }}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
