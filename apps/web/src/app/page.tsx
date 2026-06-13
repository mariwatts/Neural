import Link from 'next/link';
import { api } from '@/lib/api';
import type {
  ActivityEvent,
  NameRecord,
  ProtocolStats,
} from '@/lib/types';

import Copyable from '@/components/Copyable';
import HeroTerminal, { type TerminalSample } from '@/components/HeroTerminal';
import SearchClaim from '@/components/SearchClaim';
import StatStrip from '@/components/StatStrip';
import ActivityFeed from '@/components/ActivityFeed';
import CategoryGrid from '@/components/CategoryGrid';
import Leaderboard from '@/components/Leaderboard';
import WalletMarquee from '@/components/WalletMarquee';
import TierTable from '@/components/TierTable';
import Reveal from '@/components/Reveal';
import ScrambleText from '@/components/ScrambleText';

export const dynamic = 'force-dynamic';

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const [stats, leaders, activity, categories] = await Promise.all([
    safe<ProtocolStats | null>(api.stats(), null),
    safe<NameRecord[]>(api.leaderboard(8), []),
    safe<ActivityEvent[]>(api.activity(16), []),
    safe<{ category: string; count: number }[]>(api.categories(), []),
  ]);

  const counts = Object.fromEntries(categories.map((c) => [c.category, c.count]));
  const samples: TerminalSample[] = leaders.slice(0, 5).map((r) => ({
    name: r.name,
    owner: r.owner,
    reputation: r.card.reputationScore,
    capabilities: r.card.capabilities,
    verified: r.verified,
  }));

  return (
    <>
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="container-app" style={{ paddingTop: 'clamp(48px, 9vh, 110px)' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <span className="eyebrow">NeuralNS · Namespace Protocol for AI Agents</span>
          <h1
            style={{
              fontSize: 'clamp(40px, 7vw, 84px)',
              marginTop: 18,
              lineHeight: 0.98,
            }}
          >
            Identity for
            <br />
            <span
              style={{
                color: 'var(--ink-0)',
                WebkitTextStroke: '1.5px var(--blue)',
                paintOrder: 'stroke',
              }}
            >
              <ScrambleText text="autonomous agents." duration={1100} />
            </span>
          </h1>
          <p
            style={{
              maxWidth: 600,
              margin: '22px auto 0',
              color: 'var(--ink-1)',
              fontSize: 'clamp(15px, 1.7vw, 18px)',
              lineHeight: 1.6,
            }}
          >
            NEURONS assigns persistent, human-readable{' '}
            <span className="mono" style={{ color: 'var(--ink-0)' }}>.agent</span> names to
            AI agents on Solana — backed by an on-chain PDA and a capability-rich
            AgentCard NFT. Discoverable by humans and machines alike.
          </p>

          {/* $NEURONS contract address */}
          <div
            className="panel mono"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 22,
              padding: '10px 16px',
              fontSize: 12.5,
              maxWidth: '100%',
            }}
          >
            <span style={{ color: 'var(--ink-2)', letterSpacing: '0.08em' }}>$NEURONS CA</span>
            <span style={{ color: 'var(--ink-0)', overflowWrap: 'anywhere' }}>
              <Copyable value="GdKEzVqS6yU3H1hfwzdiRCXjGE3nsBqRMAj17EqEpump" truncate={false} />
            </span>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: '36px auto 0' }}>
          <SearchClaim />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            justifyContent: 'center',
            marginTop: 22,
          }}
        >
          <Link href="/explore" className="btn btn-ghost" data-hot>
            Explore registry
          </Link>
          <Link href="/docs" className="btn btn-ghost" data-hot>
            Read the docs
          </Link>
        </div>

        <div style={{ marginTop: 'clamp(40px, 6vh, 64px)' }}>
          <StatStrip initial={stats} />
        </div>
      </section>

      {/* ── LIVE NETWORK ───────────────────────────────────── */}
      <section className="container-app" style={{ marginTop: 'clamp(56px, 8vh, 96px)' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
            <div>
              <span className="eyebrow">The network is awake</span>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', marginTop: 10 }}>
                A living registry of working agents.
              </h2>
            </div>
            <Link href="/explore" className="mono" data-hot style={{ fontSize: 13, color: 'var(--accent)' }}>
              view all →
            </Link>
          </div>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
            gap: 18,
          }}
          className="hero-grid"
        >
          <Reveal style={{ height: '100%' }}>
            <HeroTerminal samples={samples} />
          </Reveal>
          <Reveal delay={80}>
            <ActivityFeed initial={activity} limit={9} />
          </Reveal>
        </div>
      </section>

      {/* ── WALLETS ────────────────────────────────────────── */}
      <section className="container-app" style={{ marginTop: 'clamp(48px, 7vh, 80px)' }}>
        <Reveal>
          <div className="panel" style={{ padding: '22px 8px' }}>
            <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 16 }}>
              Connect with any Solana wallet — official, no setup
            </div>
            <WalletMarquee />
          </div>
        </Reveal>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────── */}
      <section className="container-app" style={{ marginTop: 'clamp(64px, 9vh, 110px)' }}>
        <Reveal>
          <span className="eyebrow">Hierarchical namespaces</span>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', marginTop: 10, marginBottom: 8 }}>
            Discover agents by function.
          </h2>
          <p style={{ color: 'var(--ink-2)', maxWidth: 560, marginBottom: 26 }}>
            Right-to-left namespaces encode both identity and capability. Find every
            agent that can execute a DeFi swap, screen a transaction, or feed a price.
          </p>
        </Reveal>
        <Reveal delay={60}>
          <CategoryGrid counts={counts} />
        </Reveal>
      </section>

      {/* ── LEADERBOARD ────────────────────────────────────── */}
      <section className="container-app" style={{ marginTop: 'clamp(64px, 9vh, 110px)' }}>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.05fr)', gap: 40, alignItems: 'center' }}
          className="hero-grid"
        >
          <Reveal>
            <span className="eyebrow">Verification, on-chain</span>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', marginTop: 10 }}>
              Every name verifiable on Solana.
            </h2>
            <p style={{ color: 'var(--ink-2)', marginTop: 14, lineHeight: 1.6 }}>
              Every record lives in the program itself — owner, resolver, expiry and a
              verified flag set by a real on-chain transaction. Anyone can audit the
              registry by reading the program accounts directly.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              <Link href="/stats" className="btn btn-ghost" data-hot>
                Network stats
              </Link>
              <Link href="/explore?verified=true" className="btn btn-ghost" data-hot>
                Verified only
              </Link>
            </div>
          </Reveal>
          <Reveal delay={80}>
            {leaders.length ? (
              <Leaderboard records={leaders} />
            ) : (
              <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>
                Leaderboard warming up…
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────── */}
      <section id="pricing" className="container-app" style={{ marginTop: 'clamp(64px, 9vh, 110px)' }}>
        <Reveal>
          <span className="eyebrow">Transparent pricing</span>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', marginTop: 10, marginBottom: 24 }}>
            Priced by length. One-time mint.
          </h2>
        </Reveal>
        <Reveal delay={60}>
          <TierTable />
        </Reveal>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section className="container-app" style={{ marginTop: 'clamp(64px, 9vh, 110px)' }}>
        <Reveal>
          <span className="eyebrow">Four layers, tightly integrated</span>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', marginTop: 10, marginBottom: 26 }}>
            How NeuralNS works.
          </h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="panel" style={{ padding: 22, height: '100%' }}>
                <div className="mono" style={{ color: 'var(--accent)', fontSize: 13 }}>
                  0{i + 1}
                </div>
                <h3 style={{ fontSize: 19, marginTop: 14 }}>{s.title}</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 13.5, marginTop: 10, lineHeight: 1.6 }}>
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="container-app" style={{ marginTop: 'clamp(72px, 10vh, 120px)' }}>
        <Reveal>
          <div
            className="panel"
            style={{
              padding: 'clamp(32px, 6vw, 64px)',
              textAlign: 'center',
              background:
                'radial-gradient(120% 160% at 50% 0%, rgba(31,91,230,0.08), transparent 60%), var(--color-bg-1)',
            }}
          >
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)' }}>
              Claim your agent&apos;s name.
            </h2>
            <p style={{ color: 'var(--ink-1)', maxWidth: 520, margin: '16px auto 28px' }}>
              One PDA. One AgentCard. A name the entire Solana agent economy can resolve.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" className="btn btn-primary" data-hot>
                Register a name
              </Link>
              <Link href="/explore" className="btn btn-ghost" data-hot>
                Browse the registry
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

const STEPS = [
  {
    title: 'Namespace Registry',
    body: 'Each name is a PDA derived from sha256(name) + .agent. It stores owner, resolver, metadata URI, expiry and verification — no admin keys.',
  },
  {
    title: 'AgentCard NFT',
    body: 'A Token-2022 NFT carrying the capability manifest: skills, chains, endpoints, payment terms and reputation. Soulbound or transferable.',
  },
  {
    title: 'Resolution Protocol',
    body: 'Forward resolution is a direct PDA read — trustless, no indexer. Reverse and capability discovery are served by the open REST API.',
  },
  {
    title: 'Hierarchical Names',
    body: 'Right-to-left namespaces (scout.defi.agent) encode function in the name itself. Community-owned category namespaces with royalties are on the roadmap.',
  },
];
