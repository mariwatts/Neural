// $NEURONS payments — mainnet. The mint is read from the program's on-chain
// Config PDA, so swapping the token before launch needs zero code changes.
import { Buffer } from 'buffer';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getConnection, sendTx, type SolWallet } from './rpc';
import {
  ataFor,
  getProgramConfig,
  TOKEN_2022_ID,
  type ProgramConfig,
} from './program';

export async function paymentToken(): Promise<{
  mint: PublicKey | null;
  decimals: number;
  treasury: PublicKey;
  cfg: ProgramConfig;
}> {
  const cfg = await getProgramConfig();
  return { mint: cfg.tokenMint, decimals: cfg.tokenDecimals, treasury: cfg.treasury, cfg };
}

/** Browser-safe u64 LE read (Buffer polyfills may lack readBigUInt64LE). */
function readU64LE(data: Uint8Array, offset: number): bigint {
  return new DataView(data.buffer, data.byteOffset + offset, 8).getBigUint64(0, true);
}

/** $NEURONS balance (UI units) for an owner on mainnet. 0 if no token account. */
export async function neuronsBalance(owner: PublicKey): Promise<number> {
  const { mint, decimals } = await paymentToken();
  if (!mint) return 0;
  const info = await getConnection().getAccountInfo(ataFor(owner, mint));
  if (!info || info.data.length < 72) return 0;
  return Number(readU64LE(info.data, 64)) / 10 ** decimals;
}

/** Transfer `amount` $NEURONS (UI units) from payer → protocol treasury. */
export async function payNeurons(
  wallet: SolWallet,
  payer: PublicKey,
  amount: number,
): Promise<string> {
  const { mint, decimals, treasury } = await paymentToken();
  if (!mint) throw new Error('Token payments are not enabled yet.');
  const conn = getConnection();
  const userAta = ataFor(payer, mint);
  const treasuryAta = ataFor(treasury, mint);

  const ixs: TransactionInstruction[] = [];
  // Create the treasury's token account on first payment (payer funds it).
  const existing = await conn.getAccountInfo(treasuryAta);
  if (!existing) {
    ixs.push(
      new TransactionInstruction({
        programId: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        keys: [
          { pubkey: payer, isSigner: true, isWritable: true },
          { pubkey: treasuryAta, isSigner: false, isWritable: true },
          { pubkey: treasury, isSigner: false, isWritable: false },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
          { pubkey: TOKEN_2022_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([1]), // CreateIdempotent
      }),
    );
  }
  // TransferChecked = tag 12: [12, amount u64le, decimals]
  const raw = BigInt(Math.round(amount * 10 ** decimals));
  const bytes = new Uint8Array(10);
  bytes[0] = 12;
  new DataView(bytes.buffer).setBigUint64(1, raw, true);
  bytes[9] = decimals;
  const data = Buffer.from(bytes);
  ixs.push(
    new TransactionInstruction({
      programId: TOKEN_2022_ID,
      keys: [
        { pubkey: userAta, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: treasuryAta, isSigner: false, isWritable: true },
        { pubkey: payer, isSigner: true, isWritable: false },
      ],
      data,
    }),
  );

  const tx = new Transaction().add(...ixs);
  return sendTx(wallet, tx, payer);
}
