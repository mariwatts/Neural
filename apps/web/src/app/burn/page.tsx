import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import BurnClient, { type BurnStats } from '@/components/BurnClient';
import Reveal from '@/components/Reveal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Burn — NEURONS',
  description:
    '100% of NEURONS protocol revenue burns $NEURONS: token payments burn in the registration transaction, SOL revenue is bought back and burned. Live on-chain counter.',
};

async function safeBurn(): Promise<BurnStats | null> {
  try {
    return (await api.burn()) as BurnStats;
  } catch {
    return null;
  }
}

export default async function BurnPage() {
  const stats = await safeBurn();

  return (
    <div className="container-app" style={{ paddingTop: 'clamp(36px, 6vh, 64px)', paddingBottom: 60 }}>
      <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
        <span className="eyebrow">Everything burns</span>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', marginTop: 14 }}>
          $NEURONS burned <span style={{ color: 'var(--red)' }}>forever</span>.
        </h1>
        <p style={{ color: 'var(--ink-1)', maxWidth: 640, margin: '18px auto 0', lineHeight: 1.6 }}>
          Every registration shrinks the supply. Pay in <strong>$NEURONS</strong> — the full fee
          is burned inside the registration transaction. Pay in <strong>SOL</strong> — revenue is
          bought back on Jupiter and burned. No manual events, no promises: the counter below is
          computed from the live on-chain supply.
        </p>
      </div>

      <div style={{ maxWidth: 880, margin: '40px auto 0' }}>
        <BurnClient initial={stats} />
      </div>

      {/* mechanism */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          maxWidth: 880,
          margin: '40px auto 0',
        }}
      >
        <Reveal>
          <div className="panel" style={{ padding: 22, height: '100%' }}>
            <div className="mono" style={{ color: 'var(--red)', fontSize: 13 }}>01 · PAY IN $NEURONS</div>
            <p style={{ color: 'var(--ink-1)', fontSize: 13.5, marginTop: 12, lineHeight: 1.6 }}>
              The program executes <span className="mono">BurnChecked</span> on 100% of the fee
              in the same transaction that registers your name. Open any token payment on
              Solscan — the burn is right there.
            </p>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <div className="panel" style={{ padding: 22, height: '100%' }}>
            <div className="mono" style={{ color: 'var(--amber)', fontSize: 13 }}>02 · PAY IN SOL</div>
            <p style={{ color: 'var(--ink-1)', fontSize: 13.5, marginTop: 12, lineHeight: 1.6 }}>
              Accumulated SOL revenue is swapped to $NEURONS on Jupiter and burned — buy
              pressure first, supply reduction second. Every buyback and burn is a public
              transaction.
            </p>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="panel" style={{ padding: 22, height: '100%' }}>
            <div className="mono" style={{ color: 'var(--green)', fontSize: 13 }}>03 · VERIFY YOURSELF</div>
            <p style={{ color: 'var(--ink-1)', fontSize: 13.5, marginTop: 12, lineHeight: 1.6 }}>
              Burned = initial supply − live supply, read straight from the mint account.
              No dashboard tricks — check the same number on{' '}
              <a
                href="https://solscan.io/token/GdKEzVqS6yU3H1hfwzdiRCXjGE3nsBqRMAj17EqEpump"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}
              >
                Solscan
              </a>
              .
            </p>
          </div>
        </Reveal>
      </div>

      <div style={{ textAlign: 'center', marginTop: 44 }}>
        <Link href="/register" className="btn btn-primary" data-hot>
          Register a name → burn supply
        </Link>
      </div>
    </div>
  );
}
