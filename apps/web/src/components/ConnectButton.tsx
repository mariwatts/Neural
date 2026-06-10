'use client';

import { useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { short } from '@/lib/format';

/**
 * Connect Wallet — opens the Reown AppKit modal, which renders the official
 * Solana wallets (Phantom, Solflare, Backpack, …) with their own official
 * logos/names (auto-detected via the Wallet Standard + WalletConnect registry).
 * We only style the trigger; Reown owns the wallet list + logos.
 */
export default function ConnectButton({
  variant = 'nav',
}: {
  variant?: 'nav' | 'full';
}) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Stable placeholder during SSR / first paint to avoid hydration mismatch.
  if (!mounted) {
    return (
      <button
        className={variant === 'full' ? 'btn btn-primary w-full' : 'btn btn-ghost'}
        style={variant === 'nav' ? { height: 38, padding: '0 14px' } : undefined}
        aria-hidden
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => open({ view: 'Account' })}
        className="btn btn-ghost"
        style={variant === 'nav' ? { height: 38, padding: '0 12px' } : undefined}
        data-hot
      >
        <span className="live-dot" style={{ width: 6, height: 6 }} />
        <span className="mono" style={{ textTransform: 'none', letterSpacing: 0 }}>
          {short(address, 4, 4)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => open({ view: 'Connect' })}
      className={variant === 'full' ? 'btn btn-primary w-full' : 'btn btn-primary'}
      style={variant === 'nav' ? { height: 38, padding: '0 16px' } : undefined}
      data-hot
    >
      Connect Wallet
    </button>
  );
}
