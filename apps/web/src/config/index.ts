import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';

// Public Reown project id (safe to expose). Falls back to the operator-provided
// key so the connect flow works out of the box.
export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID || '4b302450b8cf7bb81541c85f8680ae23';

if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not defined');
}

export const networks = [solana, solanaTestnet, solanaDevnet] as [
  AppKitNetwork,
  ...AppKitNetwork[],
];

// Wallet detection is automatic via the Wallet Standard — no wallet list needed.
export const solanaAdapter = new SolanaAdapter();
