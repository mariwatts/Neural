'use client';

import React, { type ReactNode } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { solanaAdapter, projectId, networks } from '@/config';

const metadata = {
  name: 'NEURONS · NeuralNS',
  description: 'Namespace Protocol for AI Agents on Solana',
  url: 'http://localhost:3000',
  icons: ['http://localhost:3000/icon.svg'],
};

// Solana-native wallets pinned to the top of the modal (WalletConnect registry
// ids). Installed wallets still auto-detect via the Wallet Standard.
const FEATURED_WALLETS = [
  'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom
  '1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79', // Solflare
  '2bd8c14e035c2d48f184aaa168559e86b0e3433228d3c4075900a221785019b0', // Backpack
];

// Created once at module scope so it never re-initialises across renders.
createAppKit({
  adapters: [solanaAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'light',
  featuredWalletIds: FEATURED_WALLETS,
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeVariables: {
    '--w3m-accent': '#1f5be6',
    '--w3m-border-radius-master': '2px',
    '--w3m-font-family': 'JetBrains Mono, ui-monospace, monospace',
  },
});

export default function AppKitProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
