#!/usr/bin/env node
// NEURONS — USD price peg.
//
// Keeps the on-chain Config PDA priced in USD terms: tier prices are fixed in
// dollars, and this script converts them to lamports (via live SOL/USD) and to
// raw token units (via live token/USD) and pushes UpdateConfig when the stored
// values drift more than DRIFT_BPS from the targets.
//
// The holder discount (discount_bps, on-chain) applies to the SOL path only,
// so the token prices written here are ALREADY discounted by the same factor —
// paying with $NEURONS means you hold it, so you always get the holder rate.
//
//   node scripts/peg-prices.mjs            # check + update once
//   node scripts/peg-prices.mjs --dry      # show what would change
//   node scripts/peg-prices.mjs --watch 15 # loop every 15 minutes (for pm2)

import fs from 'node:fs';
import path from 'node:path';
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  ComputeBudgetProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// ── targets (USD) — edit here ──────────────────────────────────────────────
export const PRICES_USD = {
  premium: 25,    // 1-4 chars, permanent
  standard: 5,    // 5-9 chars, per year
  accessible: 2.5, // 10+ chars, per year
  verify: 1,      // verified badge, one-time
};
const DRIFT_BPS = 200; // update when stored price is >2% off target
// ───────────────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey('5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1');
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
const RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
export const conn = new Connection(RPC, 'confirmed');

const kpPath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'solana', 'neurons-deployer.json');
export const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(kpPath, 'utf8'))));
export const configPda = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)[0];

const u8 = (n) => Buffer.from([n & 0xff]);
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const pk = (p) => Buffer.from(p.toBytes());

export function parseConfig(data) {
  let o = 2;
  const rd = (n) => { const b = data.subarray(o, o + n); o += n; return b; };
  const admin = new PublicKey(rd(32)); const treasury = new PublicKey(rd(32));
  const tokenMint = new PublicKey(rd(32)); const tokenDecimals = rd(1)[0];
  const nums = [];
  for (let i = 0; i < 8; i++) nums.push(rd(8).readBigUInt64LE());
  const discountBps = rd(2).readUInt16LE(); const paused = rd(1)[0];
  const [pricePremium, priceStandard, priceAccessible, tokenPricePremium, tokenPriceStandard, tokenPriceAccessible, holderMinBalance, verifyFee] = nums;
  return { admin, treasury, tokenMint, tokenDecimals, pricePremium, priceStandard, priceAccessible, tokenPricePremium, tokenPriceStandard, tokenPriceAccessible, holderMinBalance, verifyFee, discountBps, paused };
}

export function configParamsBuf(p) {
  return Buffer.concat([
    pk(p.admin), pk(p.treasury), pk(p.tokenMint), u8(p.tokenDecimals),
    u64(p.pricePremium), u64(p.priceStandard), u64(p.priceAccessible),
    u64(p.tokenPricePremium), u64(p.tokenPriceStandard), u64(p.tokenPriceAccessible),
    u64(p.holderMinBalance), u64(p.verifyFee), u16(p.discountBps), u8(p.paused),
  ]);
}

export async function usdPrices(mints) {
  // Jupiter price API (lite, no key) with retries, CoinGecko fallback for SOL.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${mints.join(',')}`);
      if (res.ok) {
        const j = await res.json();
        const out = {};
        for (const m of mints) {
          const v = j[m]?.usdPrice ?? j.data?.[m]?.price;
          if (v) out[m] = Number(v);
        }
        if (Object.keys(out).length === mints.length) return out;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  // fallbacks: DexScreener per-mint (indexes brand-new tokens fastest), then
  // CoinGecko for SOL.
  const out = {};
  for (const m of mints) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${m}`);
      if (res.ok) {
        const j = await res.json();
        const pair = (j?.pairs ?? [])
          .filter((p) => p?.baseToken?.address === m && p?.priceUsd)
          .sort((a, b) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0))[0];
        if (pair) out[m] = Number(pair.priceUsd);
      }
    } catch {}
  }
  if (!out[SOL_MINT]) {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const j = await res.json();
      if (j?.solana?.usd) out[SOL_MINT] = Number(j.solana.usd);
    } catch {}
  }
  return out;
}

const drifted = (current, target) => {
  const c = Number(current);
  if (target === 0) return c !== 0;
  return Math.abs(c - target) / target > DRIFT_BPS / 10_000;
};

export async function tick(dry) {
  const info = await conn.getAccountInfo(configPda);
  if (!info) throw new Error('config not initialized');
  const cfg = parseConfig(info.data);

  const wantMints = [SOL_MINT];
  const hasToken = !cfg.tokenMint.equals(PublicKey.default);
  if (hasToken) wantMints.push(cfg.tokenMint.toBase58());
  const px = await usdPrices(wantMints);

  const solUsd = px[SOL_MINT];
  if (!solUsd) throw new Error('no SOL/USD price');
  const tokUsd = hasToken ? px[cfg.tokenMint.toBase58()] : null;

  const lam = (usd) => Math.round((usd / solUsd) * LAMPORTS_PER_SOL);
  // token prices carry the holder discount baked in (token payer = holder)
  const tokenFactor = (10_000 - cfg.discountBps) / 10_000;
  const raw = (usd) => (tokUsd ? BigInt(Math.round(((usd * tokenFactor) / tokUsd) * 10 ** cfg.tokenDecimals)) : 0n);

  const target = {
    pricePremium: lam(PRICES_USD.premium),
    priceStandard: lam(PRICES_USD.standard),
    priceAccessible: lam(PRICES_USD.accessible),
    verifyFee: lam(PRICES_USD.verify),
    tokenPricePremium: raw(PRICES_USD.premium),
    tokenPriceStandard: raw(PRICES_USD.standard),
    tokenPriceAccessible: raw(PRICES_USD.accessible),
  };

  console.log(`SOL $${solUsd}` + (tokUsd ? ` · token $${tokUsd}` : ' · token: no price'));
  console.log(`targets: premium $${PRICES_USD.premium} = ${target.pricePremium / 1e9} SOL / ${target.tokenPricePremium} raw`);
  console.log(`         standard $${PRICES_USD.standard} = ${target.priceStandard / 1e9} SOL / ${target.tokenPriceStandard} raw`);
  console.log(`         accessible $${PRICES_USD.accessible} = ${target.priceAccessible / 1e9} SOL / ${target.tokenPriceAccessible} raw`);

  const needs =
    drifted(cfg.pricePremium, target.pricePremium) ||
    drifted(cfg.priceStandard, target.priceStandard) ||
    drifted(cfg.priceAccessible, target.priceAccessible) ||
    drifted(cfg.verifyFee, target.verifyFee) ||
    (tokUsd &&
      (drifted(cfg.tokenPricePremium, Number(target.tokenPricePremium)) ||
        drifted(cfg.tokenPriceStandard, Number(target.tokenPriceStandard)) ||
        drifted(cfg.tokenPriceAccessible, Number(target.tokenPriceAccessible))));

  if (!needs) {
    console.log('within drift — no update needed');
    return;
  }
  if (dry) {
    console.log('DRY RUN — UpdateConfig would be sent');
    return;
  }

  const p = {
    ...cfg,
    pricePremium: target.pricePremium,
    priceStandard: target.priceStandard,
    priceAccessible: target.priceAccessible,
    verifyFee: target.verifyFee,
    tokenPricePremium: tokUsd ? target.tokenPricePremium : cfg.tokenPricePremium,
    tokenPriceStandard: tokUsd ? target.tokenPriceStandard : cfg.tokenPriceStandard,
    tokenPriceAccessible: tokUsd ? target.tokenPriceAccessible : cfg.tokenPriceAccessible,
  };
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
  console.log('config repriced:', sig);
}

// CLI entry — skipped when this file is imported as a module (launch-token.mjs)
const isMain = process.argv[1] && path.basename(process.argv[1]) === 'peg-prices.mjs';
if (isMain) {
  const watchIdx = process.argv.indexOf('--watch');
  const dry = process.argv.includes('--dry');
  if (watchIdx > 0) {
    const minutes = Number(process.argv[watchIdx + 1]) || 15;
    console.log(`peg watch: every ${minutes}m`);
    const loop = () => tick(false).catch((e) => console.error('peg error:', e.message));
    loop();
    setInterval(loop, minutes * 60_000);
  } else {
    tick(dry).catch((e) => { console.error(e.message); process.exit(1); });
  }
}
