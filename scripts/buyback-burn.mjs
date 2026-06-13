#!/usr/bin/env node
// NEURONS — 100% revenue burn machine.
//
// Every cycle:
//   1. burns ANY $NEURONS sitting in the treasury token account
//      (token-paid revenue / leftovers — straight into the fire);
//   2. takes SOL revenue accumulated above the recorded floor, swaps it to
//      $NEURONS via Jupiter, and burns the proceeds next cycle.
// The floor starts at the current balance (so existing operating capital is
// never spent) and only revenue above it is ever swapped. A safety RESERVE
// of SOL is always kept for rent + fees.
//
//   node scripts/buyback-burn.mjs --dry        # show what would happen
//   node scripts/buyback-burn.mjs --once
//   node scripts/buyback-burn.mjs --watch 10   # loop every 10 minutes (pm2)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  ComputeBudgetProgram, sendAndConfirmTransaction, VersionedTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1');
const TOKEN22 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SOL_MINT = 'So11111111111111111111111111111111111111112';

const RESERVE_SOL = 0.6;   // never touch — rent, fees, peg txs
const THRESHOLD_SOL = 0.25; // swap only when at least this much revenue piled up
const SLIPPAGE_BPS = 300;

const RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const conn = new Connection(RPC, 'confirmed');
const kpPath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'solana', 'neurons-deployer.json');
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(kpPath, 'utf8'))));
const STATE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.buyback-state.json');

const configPda = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)[0];
const ata = (owner, mint) =>
  PublicKey.findProgramAddressSync([owner.toBytes(), TOKEN22.toBytes(), mint.toBytes()], ATA_PROGRAM)[0];

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function saveState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s));
}

async function getMint() {
  const info = await conn.getAccountInfo(configPda);
  if (!info) throw new Error('config not initialized');
  const mint = new PublicKey(info.data.subarray(66, 98));
  const decimals = info.data[98];
  if (mint.equals(PublicKey.default)) throw new Error('no payment token configured');
  return { mint, decimals };
}

async function burnTreasuryTokens(mint, decimals, dry) {
  const treasuryAta = ata(payer.publicKey, mint);
  const info = await conn.getAccountInfo(treasuryAta);
  if (!info || info.data.length < 72) return 0n;
  const amount = info.data.readBigUInt64LE(64);
  if (amount === 0n) return 0n;
  console.log(`treasury holds ${Number(amount) / 10 ** decimals} tokens → burning ALL`);
  if (dry) return amount;
  const data = Buffer.alloc(10);
  data[0] = 15; // BurnChecked
  data.writeBigUInt64LE(amount, 1);
  data[9] = decimals;
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }),
    new TransactionInstruction({
      programId: TOKEN22,
      keys: [
        { pubkey: treasuryAta, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      ],
      data,
    }),
  );
  const sig = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'confirmed', maxRetries: 10 });
  console.log('BURNED:', sig);
  console.log('https://solscan.io/tx/' + sig);
  return amount;
}

async function buyback(mint, dry) {
  const state = loadState();
  const balance = await conn.getBalance(payer.publicKey);
  if (state.floorLamports === undefined) {
    state.floorLamports = balance;
    saveState(state);
    console.log(`floor initialised at ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL — only NEW revenue above this burns`);
    return;
  }
  // ops spending can drop the balance below the floor — follow it down
  if (balance < state.floorLamports) {
    state.floorLamports = balance;
    saveState(state);
  }
  const reserve = Math.round(RESERVE_SOL * LAMPORTS_PER_SOL);
  const excess = balance - Math.max(state.floorLamports, reserve);
  console.log(`balance ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL · floor ${(state.floorLamports / LAMPORTS_PER_SOL).toFixed(4)} · revenue ${(Math.max(0, excess) / LAMPORTS_PER_SOL).toFixed(4)}`);
  if (excess < THRESHOLD_SOL * LAMPORTS_PER_SOL) {
    console.log('below threshold — nothing to buy back');
    return;
  }
  if (dry) {
    console.log(`DRY: would swap ${(excess / LAMPORTS_PER_SOL).toFixed(4)} SOL → $NEURONS via Jupiter`);
    return;
  }
  const quoteRes = await fetch(
    `https://lite-api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${mint.toBase58()}&amount=${excess}&slippageBps=${SLIPPAGE_BPS}`,
  );
  if (!quoteRes.ok) throw new Error('jupiter quote failed: ' + (await quoteRes.text()).slice(0, 120));
  const quote = await quoteRes.json();
  const swapRes = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: payer.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: { priorityLevelWithMaxLamports: { priorityLevel: 'high', maxLamports: 2_000_000 } },
    }),
  });
  if (!swapRes.ok) throw new Error('jupiter swap failed: ' + (await swapRes.text()).slice(0, 120));
  const { swapTransaction } = await swapRes.json();
  const vtx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
  vtx.sign([payer]);
  const sig = await conn.sendTransaction(vtx, { maxRetries: 5 });
  await conn.confirmTransaction(sig, 'confirmed');
  console.log(`BOUGHT BACK ${(excess / LAMPORTS_PER_SOL).toFixed(4)} SOL worth of $NEURONS:`, sig);
  console.log('https://solscan.io/tx/' + sig);
  // bought tokens now sit in the treasury ATA — burned at the start of the
  // next cycle (or immediately on the next tick)
}

async function tick(dry) {
  const { mint, decimals } = await getMint();
  await burnTreasuryTokens(mint, decimals, dry);
  await buyback(mint, dry);
}

const dry = process.argv.includes('--dry');
const watchIdx = process.argv.indexOf('--watch');
if (watchIdx > 0) {
  const minutes = Number(process.argv[watchIdx + 1]) || 10;
  console.log(`buyback-burn watch: every ${minutes}m (reserve ${RESERVE_SOL} SOL, threshold ${THRESHOLD_SOL} SOL)`);
  const loop = () => tick(false).catch((e) => console.error('buyback error:', e.message));
  loop();
  setInterval(loop, minutes * 60_000);
} else {
  tick(dry).catch((e) => { console.error(e.message); process.exit(1); });
}
