#!/usr/bin/env node
// NEURONS v2 — mainnet admin / smoke-test CLI.
//
//   node scripts/neurons-admin.mjs status
//   node scripts/neurons-admin.mjs init-config
//   node scripts/neurons-admin.mjs update-config [--token-mint <pk>] [--token-decimals 6] [--premium 5] [--standard 1] [--accessible 0.1] [--paused 0|1]
//   node scripts/neurons-admin.mjs create-token            (test Token-2022, 6 dec, 1M supply -> deployer)
//   node scripts/neurons-admin.mjs register <name> [--years 1] [--uri <u>] [--discount]
//   node scripts/neurons-admin.mjs register-token <name> [--years 1] [--uri <u>]
//   node scripts/neurons-admin.mjs mint-card <name> [--soulbound]
//   node scripts/neurons-admin.mjs verify-name <name>
//   node scripts/neurons-admin.mjs resolve <name>
//
// Keypair: ~/.config/solana/neurons-deployer.json (admin + treasury + test payer)

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1');
const TOKEN22 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

const conn = new Connection(RPC, 'confirmed');
const kpPath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'solana', 'neurons-deployer.json');
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(kpPath, 'utf8'))));

const sha256 = (s) => createHash('sha256').update(s).digest();
const namePda = (name) => PublicKey.findProgramAddressSync([Buffer.from('name'), sha256(name)], PROGRAM_ID)[0];
const cardPda = (name) => PublicKey.findProgramAddressSync([Buffer.from('card'), sha256(name)], PROGRAM_ID)[0];
const configPda = () => PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)[0];
const ata = (owner, mint) =>
  PublicKey.findProgramAddressSync([owner.toBytes(), TOKEN22.toBytes(), mint.toBytes()], ATA_PROGRAM)[0];

// ── borsh helpers ──
const u8 = (n) => Buffer.from([n & 0xff]);
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const str = (s) => { const d = Buffer.from(s, 'utf8'); return Buffer.concat([u32(d.length), d]); };
const pk = (p) => Buffer.from(p.toBytes());

function configParamsBuf(p) {
  return Buffer.concat([
    pk(p.admin), pk(p.treasury), pk(p.tokenMint), u8(p.tokenDecimals),
    u64(p.pricePremium), u64(p.priceStandard), u64(p.priceAccessible),
    u64(p.tokenPricePremium), u64(p.tokenPriceStandard), u64(p.tokenPriceAccessible),
    u64(p.holderMinBalance), u64(p.verifyFee), u16(p.discountBps), u8(p.paused),
  ]);
}

function parseConfig(data) {
  let o = 0;
  const rd = (n) => { const b = data.subarray(o, o + n); o += n; return b; };
  const version = rd(1)[0]; const bump = rd(1)[0];
  const admin = new PublicKey(rd(32)); const treasury = new PublicKey(rd(32));
  const tokenMint = new PublicKey(rd(32)); const tokenDecimals = rd(1)[0];
  const nums = [];
  for (let i = 0; i < 8; i++) nums.push(rd(8).readBigUInt64LE());
  const discountBps = rd(2).readUInt16LE(); const paused = rd(1)[0];
  const [pricePremium, priceStandard, priceAccessible, tokenPricePremium, tokenPriceStandard, tokenPriceAccessible, holderMinBalance, verifyFee] = nums;
  return { version, bump, admin, treasury, tokenMint, tokenDecimals, pricePremium, priceStandard, priceAccessible, tokenPricePremium, tokenPriceStandard, tokenPriceAccessible, holderMinBalance, verifyFee, discountBps, paused };
}

function parseRecord(data) {
  let o = 0;
  const rd = (n) => { const b = data.subarray(o, o + n); o += n; return b; };
  const version = rd(1)[0]; const bump = rd(1)[0];
  const owner = new PublicKey(rd(32)); const resolver = new PublicKey(rd(32));
  const expiry = rd(8).readBigInt64LE(); const verified = rd(1)[0] === 1;
  const cardMint = new PublicKey(rd(32));
  const nlen = rd(4).readUInt32LE(); const name = rd(nlen).toString('utf8');
  const ulen = rd(4).readUInt32LE(); const uri = rd(ulen).toString('utf8');
  return { version, bump, owner, resolver, expiry, verified, cardMint, name, uri };
}

async function send(ixs, extraSigners = []) {
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }),
    ...ixs,
  );
  const sig = await sendAndConfirmTransaction(conn, tx, [payer, ...extraSigners], {
    commitment: 'confirmed',
    maxRetries: 10,
  });
  console.log('sig:', sig);
  console.log('https://solscan.io/tx/' + sig);
  return sig;
}

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const has = (flag) => process.argv.includes(flag);
const SOL = (n) => Math.round(Number(n) * LAMPORTS_PER_SOL);

const DEFAULTS = {
  admin: payer.publicKey,
  treasury: payer.publicKey,
  tokenMint: PublicKey.default,
  tokenDecimals: 6,
  // TEST prices — tiny on purpose; flip to 5 / 1 / 0.1 SOL via update-config before launch
  pricePremium: SOL(0.005),
  priceStandard: SOL(0.002),
  priceAccessible: SOL(0.001),
  tokenPricePremium: 1000n * 10n ** 6n,
  tokenPriceStandard: 100n * 10n ** 6n,
  tokenPriceAccessible: 10n * 10n ** 6n,
  holderMinBalance: 100n * 10n ** 6n,
  verifyFee: SOL(0.0005),
  discountBps: 2500,
  paused: 0,
};

async function getConfig() {
  const info = await conn.getAccountInfo(configPda());
  if (!info) return null;
  return parseConfig(info.data);
}

const cmd = process.argv[2];

if (cmd === 'status') {
  console.log('program:', PROGRAM_ID.toBase58());
  console.log('payer:', payer.publicKey.toBase58(), (await conn.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL, 'SOL');
  console.log('config pda:', configPda().toBase58());
  const cfg = await getConfig();
  if (!cfg) { console.log('config: NOT INITIALIZED'); process.exit(0); }
  for (const [k, v] of Object.entries(cfg)) console.log(' ', k + ':', v?.toBase58 ? v.toBase58() : String(v));
} else if (cmd === 'init-config') {
  const data = Buffer.concat([u8(9), configParamsBuf(DEFAULTS)]);
  await send([new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })]);
  console.log('config initialized');
} else if (cmd === 'update-config') {
  const cur = await getConfig();
  if (!cur) throw new Error('config not initialized');
  const p = {
    admin: new PublicKey(arg('--admin', cur.admin.toBase58())),
    treasury: new PublicKey(arg('--treasury', cur.treasury.toBase58())),
    tokenMint: new PublicKey(arg('--token-mint', cur.tokenMint.toBase58())),
    tokenDecimals: Number(arg('--token-decimals', cur.tokenDecimals)),
    pricePremium: arg('--premium') ? SOL(arg('--premium')) : cur.pricePremium,
    priceStandard: arg('--standard') ? SOL(arg('--standard')) : cur.priceStandard,
    priceAccessible: arg('--accessible') ? SOL(arg('--accessible')) : cur.priceAccessible,
    tokenPricePremium: arg('--tok-premium') ? BigInt(arg('--tok-premium')) : cur.tokenPricePremium,
    tokenPriceStandard: arg('--tok-standard') ? BigInt(arg('--tok-standard')) : cur.tokenPriceStandard,
    tokenPriceAccessible: arg('--tok-accessible') ? BigInt(arg('--tok-accessible')) : cur.tokenPriceAccessible,
    holderMinBalance: arg('--holder-min') ? BigInt(arg('--holder-min')) : cur.holderMinBalance,
    verifyFee: arg('--verify-fee') ? SOL(arg('--verify-fee')) : cur.verifyFee,
    discountBps: Number(arg('--discount-bps', cur.discountBps)),
    paused: Number(arg('--paused', cur.paused)),
  };
  const data = Buffer.concat([u8(10), configParamsBuf(p)]);
  await send([new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: configPda(), isSigner: false, isWritable: true },
    ],
    data,
  })]);
  console.log('config updated; token mint =', p.tokenMint.toBase58());
} else if (cmd === 'create-token') {
  const mint = Keypair.generate();
  const rent = await conn.getMinimumBalanceForRentExemption(82);
  const initMint = Buffer.concat([u8(20), u8(6), pk(payer.publicKey), u8(0)]); // InitializeMint2, 6 dec, no freeze
  const myAta = ata(payer.publicKey, mint.publicKey);
  const createAta = new TransactionInstruction({
    programId: ATA_PROGRAM,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: myAta, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: false, isWritable: false },
      { pubkey: mint.publicKey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN22, isSigner: false, isWritable: false },
    ],
    data: u8(1),
  });
  const mintTo = new TransactionInstruction({
    programId: TOKEN22,
    keys: [
      { pubkey: mint.publicKey, isSigner: false, isWritable: true },
      { pubkey: myAta, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([u8(7), u64(1_000_000n * 10n ** 6n)]), // 1M tokens
  });
  await send([
    SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: mint.publicKey, lamports: rent, space: 82, programId: TOKEN22 }),
    new TransactionInstruction({ programId: TOKEN22, keys: [{ pubkey: mint.publicKey, isSigner: false, isWritable: true }], data: initMint }),
    createAta,
    mintTo,
  ], [mint]);
  console.log('test Token-2022 mint:', mint.publicKey.toBase58());
  console.log('1,000,000 tokens minted to', myAta.toBase58());
} else if (cmd === 'register' || cmd === 'register-token') {
  const name = process.argv[3];
  if (!name) throw new Error('usage: register <name.agent>');
  const years = Number(arg('--years', 1));
  const uri = arg('--uri', `https://neuralns.xyz/api/agent/${name}/capabilities`);
  const cfg = await getConfig();
  const record = namePda(name);
  const tag = cmd === 'register' ? 0 : 1;
  const data = Buffer.concat([u8(tag), str(name), pk(payer.publicKey), u32(years), str(uri)]);
  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: record, isSigner: false, isWritable: true },
    { pubkey: configPda(), isSigner: false, isWritable: false },
    { pubkey: cfg.treasury, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  if (cmd === 'register-token') {
    keys.push(
      // mint writable: the program burns the fee
      { pubkey: cfg.tokenMint, isSigner: false, isWritable: true },
      { pubkey: ata(payer.publicKey, cfg.tokenMint), isSigner: false, isWritable: true },
      { pubkey: ata(cfg.treasury, cfg.tokenMint), isSigner: false, isWritable: true },
      { pubkey: TOKEN22, isSigner: false, isWritable: false },
    );
  } else if (has('--discount')) {
    keys.push(
      { pubkey: cfg.tokenMint, isSigner: false, isWritable: false },
      { pubkey: ata(payer.publicKey, cfg.tokenMint), isSigner: false, isWritable: false },
    );
  }
  await send([new TransactionInstruction({ programId: PROGRAM_ID, keys, data })]);
  console.log('registered:', name, '→ PDA', record.toBase58());
} else if (cmd === 'mint-card') {
  const name = process.argv[3];
  if (!name) throw new Error('usage: mint-card <name.agent>');
  const record = namePda(name);
  const card = cardPda(name);
  const ownerAta = ata(payer.publicKey, card);
  const data = Buffer.concat([u8(6), u8(has('--soulbound') ? 1 : 0)]);
  await send([new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: record, isSigner: false, isWritable: true },
      { pubkey: card, isSigner: false, isWritable: true },
      { pubkey: ownerAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN22, isSigner: false, isWritable: false },
      { pubkey: ATA_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })]);
  console.log('AgentCard NFT mint:', card.toBase58());
} else if (cmd === 'create-treasury-ata') {
  // Create the treasury's ATA for the CONFIGURED payment token (idempotent).
  // Required once after every token swap — RegisterWithToken transfers into it.
  const cfg = await getConfig();
  if (cfg.tokenMint.equals(PublicKey.default)) throw new Error('no token configured');
  const tAta = ata(cfg.treasury, cfg.tokenMint);
  await send([new TransactionInstruction({
    programId: ATA_PROGRAM,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: tAta, isSigner: false, isWritable: true },
      { pubkey: cfg.treasury, isSigner: false, isWritable: false },
      { pubkey: cfg.tokenMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN22, isSigner: false, isWritable: false },
    ],
    data: u8(1), // CreateIdempotent
  })]);
  console.log('treasury ATA ready:', tAta.toBase58());
} else if (cmd === 'verify-name') {
  const name = process.argv[3];
  const cfg = await getConfig();
  await send([new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: namePda(name), isSigner: false, isWritable: true },
      { pubkey: configPda(), isSigner: false, isWritable: false },
      { pubkey: cfg.treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: u8(7),
  })]);
  console.log('verified:', name);
} else if (cmd === 'resolve') {
  const name = process.argv[3];
  const info = await conn.getAccountInfo(namePda(name));
  if (!info) { console.log('not registered'); process.exit(1); }
  const rec = parseRecord(info.data);
  console.log('pda:', namePda(name).toBase58());
  for (const [k, v] of Object.entries(rec)) console.log(' ', k + ':', v?.toBase58 ? v.toBase58() : String(v));
} else {
  console.log('commands: status | init-config | update-config | create-token | register | register-token | mint-card | verify-name | resolve');
}
