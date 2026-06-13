#!/usr/bin/env node
// NEURONS — token launch switchover.
//
// Run this the moment the real $NEURONS token launches (or even a bit before —
// it waits). It will:
//   1. poll the chain until the mint account exists, read its decimals and
//      verify it is a Token-2022 mint (the program pays via Token-2022
//      transfer_checked — a classic SPL mint will NOT work);
//   2. poll Jupiter/DexScreener until the token has a USD price (new tokens
//      appear within minutes of the first liquidity pool);
//   3. send ONE UpdateConfig that atomically sets: the new mint, decimals,
//      USD-pegged token prices (holder discount baked in) and the holder-
//      discount threshold (default: $10 worth of tokens);
//   4. keep re-pegging every 2 minutes for the first hour (launch volatility),
//      then exit — leave `peg-prices.mjs --watch 15` running for steady state.
//
//   node scripts/launch-token.mjs <MINT> [--holder-usd 10] [--settle 60]

import {
  PublicKey, Transaction, TransactionInstruction,
  ComputeBudgetProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  PRICES_SOL, SOL_MINT, PROGRAM_ID, conn, payer, configPda,
  parseConfig, configParamsBuf, usdPrices, tick,
} from './peg-prices.mjs';

const TOKEN22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

const mintArg = process.argv[2];
if (!mintArg || mintArg.startsWith('--')) {
  console.log('usage: node scripts/launch-token.mjs <MINT> [--holder-usd 10] [--settle 60]');
  process.exit(1);
}
const MINT = new PublicKey(mintArg);
const argNum = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};
const HOLDER_USD = argNum('--holder-usd', 10);
const SETTLE_MIN = argNum('--settle', 60);
const DRY = process.argv.includes('--dry');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const u8 = (n) => Buffer.from([n & 0xff]);

async function waitForMint() {
  process.stdout.write(`waiting for mint ${MINT.toBase58()} `);
  for (;;) {
    const info = await conn.getAccountInfo(MINT).catch(() => null);
    if (info) {
      console.log('\nmint is live · owner program:', info.owner.toBase58());
      if (info.owner.toBase58() !== TOKEN22) {
        console.error('ERROR: mint is NOT Token-2022 — the program cannot charge it.');
        console.error('Launch the token as Token-2022 or upgrade the program first.');
        process.exit(1);
      }
      const decimals = info.data[44];
      console.log('decimals:', decimals);
      return decimals;
    }
    process.stdout.write('.');
    await sleep(10_000);
  }
}

async function waitForPrice() {
  process.stdout.write('waiting for a USD price (Jupiter/DexScreener) ');
  for (;;) {
    const px = await usdPrices([SOL_MINT, MINT.toBase58()]).catch(() => ({}));
    if (px[MINT.toBase58()] && px[SOL_MINT]) {
      console.log(`\npriced: token $${px[MINT.toBase58()]} · SOL $${px[SOL_MINT]}`);
      return px;
    }
    process.stdout.write('.');
    await sleep(20_000);
  }
}

async function main() {
  const decimals = await waitForMint();
  const px = await waitForPrice();

  const info = await conn.getAccountInfo(configPda);
  const cfg = parseConfig(info.data);
  const tokUsd = px[MINT.toBase58()];
  const solUsd = px[SOL_MINT];

  const tokenFactor = (10_000 - cfg.discountBps) / 10_000;
  const raw = (usd) => BigInt(Math.round(((usd * tokenFactor) / tokUsd) * 10 ** decimals));
  const lam = (usd) => Math.round((usd / solUsd) * LAMPORTS_PER_SOL);

  const p = {
    ...cfg,
    tokenMint: MINT,
    tokenDecimals: decimals,
    pricePremium: lam(PRICES_SOL.premium),
    priceStandard: lam(PRICES_SOL.standard),
    priceAccessible: lam(PRICES_SOL.accessible),
    verifyFee: lam(PRICES_SOL.verify),
    tokenPricePremium: raw(PRICES_SOL.premium),
    tokenPriceStandard: raw(PRICES_SOL.standard),
    tokenPriceAccessible: raw(PRICES_SOL.accessible),
    // discount threshold: hold ≥ $HOLDER_USD worth (no discount baked here)
    holderMinBalance: BigInt(Math.round((HOLDER_USD / tokUsd) * 10 ** decimals)),
  };

  console.log('switching config to the new token:');
  console.log(`  premium    $${PRICES_SOL.premium} = ${Number(p.tokenPricePremium) / 10 ** decimals} tokens / ${p.pricePremium / 1e9} SOL`);
  console.log(`  standard   $${PRICES_SOL.standard} = ${Number(p.tokenPriceStandard) / 10 ** decimals} tokens / ${p.priceStandard / 1e9} SOL`);
  console.log(`  accessible $${PRICES_SOL.accessible} = ${Number(p.tokenPriceAccessible) / 10 ** decimals} tokens / ${p.priceAccessible / 1e9} SOL`);
  console.log(`  holder discount from ${Number(p.holderMinBalance) / 10 ** decimals} tokens (~$${HOLDER_USD})`);

  if (DRY) {
    console.log('DRY RUN — UpdateConfig not sent');
    return;
  }

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }),
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        { pubkey: configPda, isSigner: false, isWritable: true },
      ],
      data: Buffer.concat([u8(10), configParamsBuf(p)]),
    }),
  );
  const sig = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'confirmed', maxRetries: 10 });
  console.log('LIVE — token payments enabled:', sig);
  console.log('https://solscan.io/tx/' + sig);

  // launch volatility: re-peg aggressively for the first hour
  console.log(`settle mode: re-pegging every 2m for ${SETTLE_MIN}m…`);
  const until = Date.now() + SETTLE_MIN * 60_000;
  while (Date.now() < until) {
    await sleep(2 * 60_000);
    await tick(false).catch((e) => console.error('peg error:', e.message));
  }
  console.log('settle done — keep `node scripts/peg-prices.mjs --watch 15` running.');
}

main().catch((e) => { console.error(e); process.exit(1); });
