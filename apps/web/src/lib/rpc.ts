import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// Same-origin proxy → reliable RPC server-side (key stays on the server).
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const RPC_URL = `${API}/rpc`;

export function getConnection(): Connection {
  return new Connection(RPC_URL, { commitment: 'confirmed' });
}

export interface SolWallet {
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (
    tx: Transaction,
  ) => Promise<string | { signature: string }>;
}

/** Poll signature status over HTTP (no websocket needed through the proxy). */
async function confirm(conn: Connection, sig: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const { value } = await conn.getSignatureStatuses([sig]);
    const s = value[0];
    if (s) {
      if (s.err) throw new Error('Transaction failed on-chain.');
      if (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized') return;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('Not confirmed in time — it may still land; check Solscan in a minute.');
}

/**
 * Robust send: fresh blockhash from our reliable RPC, sign in the wallet, send
 * via the same RPC with retries, then confirm by polling. This avoids the
 * "wallet returned a signature but the tx never landed" drop.
 */
export async function sendTx(
  wallet: SolWallet,
  tx: Transaction,
  payer: PublicKey,
): Promise<string> {
  const conn = getConnection();
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;

  if (wallet.signTransaction) {
    const signed = await wallet.signTransaction(tx);
    const sig = await conn.sendRawTransaction(signed.serialize(), {
      maxRetries: 5,
      preflightCommitment: 'confirmed',
    });
    await confirm(conn, sig);
    return sig;
  }

  if (wallet.signAndSendTransaction) {
    const res = await wallet.signAndSendTransaction(tx);
    const sig = typeof res === 'string' ? res : res.signature;
    await confirm(conn, sig);
    return sig;
  }

  throw new Error('Wallet does not support signing.');
}
