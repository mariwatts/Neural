// Client helpers for the NeuralNS v2 program on Solana mainnet.
// Mirrors onchain/src/lib.rs: PDAs ["name"|"card"|"config", ...], borsh ixs.
// All economics (prices, payment token mint, treasury) are read from the
// on-chain Config PDA — swapping the token never requires a redeploy.
import { Buffer } from 'buffer';
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { getConnection } from './rpc';

export const PROGRAM_ID = new PublicKey(
  '5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1',
);
export const TOKEN_2022_ID = new PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
);
export const TOKEN_CLASSIC_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
export const ATA_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

const enc = new TextEncoder();

// ── on-chain config ──
export interface ProgramConfig {
  admin: PublicKey;
  treasury: PublicKey;
  tokenMint: PublicKey | null; // null = token payments disabled
  tokenDecimals: number;
  priceSol: { premium: number; standard: number; accessible: number }; // SOL units
  priceToken: { premium: bigint; standard: bigint; accessible: bigint }; // raw units
  holderMinBalance: bigint;
  verifyFeeSol: number;
  discountBps: number;
  paused: boolean;
}

export function configPda(): PublicKey {
  return PublicKey.findProgramAddressSync([enc.encode('config')], PROGRAM_ID)[0];
}

let cachedConfig: { value: ProgramConfig; at: number } | null = null;

/** Fetch + parse the Config PDA (cached for 60s). */
export async function getProgramConfig(): Promise<ProgramConfig> {
  if (cachedConfig && Date.now() - cachedConfig.at < 60_000) return cachedConfig.value;
  const info = await getConnection().getAccountInfo(configPda());
  if (!info) throw new Error('NeuralNS config not initialized on-chain.');
  const d = info.data;
  const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
  let o = 2; // version, bump
  const rdPk = () => { const p = new PublicKey(d.subarray(o, o + 32)); o += 32; return p; };
  const rdU64 = () => { const v = view.getBigUint64(o, true); o += 8; return v; };
  const admin = rdPk();
  const treasury = rdPk();
  const mint = rdPk();
  const tokenDecimals = d[o]; o += 1;
  const pPrem = rdU64(); const pStd = rdU64(); const pAcc = rdU64();
  const tPrem = rdU64(); const tStd = rdU64(); const tAcc = rdU64();
  const holderMin = rdU64(); const verifyFee = rdU64();
  const discountBps = view.getUint16(o, true); o += 2;
  const paused = d[o] === 1;
  const cfg: ProgramConfig = {
    admin,
    treasury,
    tokenMint: mint.equals(PublicKey.default) ? null : mint,
    tokenDecimals,
    priceSol: {
      premium: Number(pPrem) / 1e9,
      standard: Number(pStd) / 1e9,
      accessible: Number(pAcc) / 1e9,
    },
    priceToken: { premium: tPrem, standard: tStd, accessible: tAcc },
    holderMinBalance: holderMin,
    verifyFeeSol: Number(verifyFee) / 1e9,
    discountBps,
    paused,
  };
  cachedConfig = { value: cfg, at: Date.now() };
  return cfg;
}

export type Tier = 'premium' | 'standard' | 'accessible';

export function tierForLabel(label: string): { tier: Tier; permanent: boolean } {
  if (label.length <= 4) return { tier: 'premium', permanent: true };
  if (label.length <= 9) return { tier: 'standard', permanent: false };
  return { tier: 'accessible', permanent: false };
}

/** SOL + token price for a label (yearly unless permanent). */
export function priceFor(cfg: ProgramConfig, label: string): {
  tier: Tier;
  permanent: boolean;
  sol: number;
  token: bigint;
} {
  const { tier, permanent } = tierForLabel(label);
  return { tier, permanent, sol: cfg.priceSol[tier], token: cfg.priceToken[tier] };
}

// ── PDAs ──
async function sha256(name: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(name)));
}

export async function namePda(name: string): Promise<PublicKey> {
  const hash = await sha256(name);
  return PublicKey.findProgramAddressSync([enc.encode('name'), hash], PROGRAM_ID)[0];
}

export async function cardPda(name: string): Promise<PublicKey> {
  const hash = await sha256(name);
  return PublicKey.findProgramAddressSync([enc.encode('card'), hash], PROGRAM_ID)[0];
}

export function ataFor(owner: PublicKey, mint: PublicKey, tokenProgram = TOKEN_2022_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBytes(), tokenProgram.toBytes(), mint.toBytes()],
    ATA_PROGRAM_ID,
  )[0];
}

// ── borsh encoding ──
function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function bstr(s: string): Buffer {
  const d = enc.encode(s);
  return Buffer.concat([Buffer.from(u32le(d.length)), Buffer.from(d)]);
}

function registerData(
  tag: 0 | 1,
  name: string,
  resolver: PublicKey,
  years: number,
  metadataUri: string,
): Buffer {
  return Buffer.concat([
    Buffer.from([tag]),
    bstr(name),
    Buffer.from(resolver.toBytes()),
    Buffer.from(u32le(years)),
    bstr(metadataUri),
  ]);
}

// ── instruction builders ──
export interface RegisterOpts {
  years?: number;
  metadataUri?: string;
  /** pay the fee in the configured token instead of SOL */
  payWithToken?: boolean;
  /** attach holder-discount accounts (SOL payment only) */
  useDiscount?: boolean;
}

export async function buildRegisterIx(
  payer: PublicKey,
  name: string,
  cfg: ProgramConfig,
  opts: RegisterOpts = {},
): Promise<{ ix: TransactionInstruction; pda: PublicKey }> {
  const years = opts.years ?? 1;
  const uri = opts.metadataUri ?? '';
  const pda = await namePda(name);
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: pda, isSigner: false, isWritable: true },
    { pubkey: configPda(), isSigner: false, isWritable: false },
    { pubkey: cfg.treasury, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  let tag: 0 | 1 = 0;
  if (opts.payWithToken) {
    if (!cfg.tokenMint) throw new Error('Token payments are not enabled.');
    tag = 1;
    keys.push(
      { pubkey: cfg.tokenMint, isSigner: false, isWritable: false },
      { pubkey: ataFor(payer, cfg.tokenMint), isSigner: false, isWritable: true },
      { pubkey: ataFor(cfg.treasury, cfg.tokenMint), isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_ID, isSigner: false, isWritable: false },
    );
  } else if (opts.useDiscount && cfg.tokenMint) {
    keys.push(
      { pubkey: cfg.tokenMint, isSigner: false, isWritable: false },
      { pubkey: ataFor(payer, cfg.tokenMint), isSigner: false, isWritable: false },
    );
  }
  return {
    ix: new TransactionInstruction({
      programId: PROGRAM_ID,
      keys,
      data: registerData(tag, name, payer, years, uri),
    }),
    pda,
  };
}

/** MintAgentCard — Token-2022 NFT for a registered name (bundle after register). */
export async function buildMintCardIx(
  owner: PublicKey,
  name: string,
  soulbound: boolean,
): Promise<{ ix: TransactionInstruction; mint: PublicKey }> {
  const record = await namePda(name);
  const card = await cardPda(name);
  const ownerAta = ataFor(owner, card);
  return {
    ix: new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: record, isSigner: false, isWritable: true },
        { pubkey: card, isSigner: false, isWritable: true },
        { pubkey: ownerAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_ID, isSigner: false, isWritable: false },
        { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([6, soulbound ? 1 : 0]),
    }),
    mint: card,
  };
}

/** Token balance of `owner` for the configured payment token (UI units). */
export async function configTokenBalance(
  owner: PublicKey,
  cfg: ProgramConfig,
): Promise<number> {
  if (!cfg.tokenMint) return 0;
  const conn = getConnection();
  const info = await conn.getAccountInfo(ataFor(owner, cfg.tokenMint));
  if (!info || info.data.length < 72) return 0;
  const view = new DataView(info.data.buffer, info.data.byteOffset + 64, 8);
  return Number(view.getBigUint64(0, true)) / 10 ** cfg.tokenDecimals;
}
