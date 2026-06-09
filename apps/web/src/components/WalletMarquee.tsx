'use client';

import { WalletIcon, TokenIcon } from '@web3icons/react/dynamic';

const WALLETS: { id: string; name: string }[] = [
  { id: 'phantom', name: 'Phantom' },
  { id: 'solflare', name: 'Solflare' },
  { id: 'backpack', name: 'Backpack' },
  { id: 'coinbase', name: 'Coinbase Wallet' },
  { id: 'trust', name: 'Trust' },
  { id: 'okx', name: 'OKX Wallet' },
  { id: 'ledger', name: 'Ledger' },
  { id: 'glow', name: 'Glow' },
];

function Item({ id, name }: { id: string; name: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 26px',
        opacity: 0.78,
      }}
    >
      <WalletIcon
        id={id}
        variant="branded"
        size={26}
        fallback={
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'var(--bg-3)',
              display: 'inline-block',
            }}
          />
        }
      />
      <span className="mono" style={{ fontSize: 13, color: 'var(--ink-1)', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </span>
  );
}

export default function WalletMarquee() {
  const row = [...WALLETS, ...WALLETS];
  return (
    <div style={{ position: 'relative', overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}>
      <div className="marquee-track" style={{ alignItems: 'center', padding: '6px 0' }}>
        {row.map((w, i) => (
          <Item key={`${w.id}-${i}`} id={w.id} name={w.name} />
        ))}
      </div>
    </div>
  );
}

/** Small inline token chip (SOL / USDC) with official logo. */
export function TokenChip({ symbol }: { symbol: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <TokenIcon
        symbol={symbol}
        variant="branded"
        size={16}
        fallback={<span style={{ width: 16, height: 16 }} />}
      />
      <span className="mono" style={{ fontSize: 12 }}>{symbol}</span>
    </span>
  );
}
