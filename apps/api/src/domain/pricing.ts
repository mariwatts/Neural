import type { PriceTier } from './types';

const YEAR_SECONDS = 365 * 24 * 60 * 60;
export const VERIFY_FEE_SOL = 0.01;
export const RENEW_FEE_SOL = 0.1;

/** Tiered pricing keyed on the left-most label length (cd.md §5). */
export function priceForLabel(label: string): {
  tier: PriceTier;
  priceSol: number;
  permanent: boolean;
} {
  const len = label.length;
  if (len <= 4) return { tier: 'premium', priceSol: 5, permanent: true };
  if (len <= 9) return { tier: 'standard', priceSol: 1, permanent: false };
  return { tier: 'accessible', priceSol: 0.1, permanent: false };
}

export function expiryFor(permanent: boolean, nowSec: number): number {
  return permanent ? 0 : nowSec + YEAR_SECONDS;
}

/**
 * Revenue split from cd.md §4.2:
 *   Treasury 40% · Stakers 30% · Burn 25%  (Category owner 5% omitted here).
 */
export function splitRevenue(amountSol: number): {
  treasury: number;
  stakers: number;
  burned: number;
} {
  return {
    treasury: round(amountSol * 0.4),
    stakers: round(amountSol * 0.3),
    burned: round(amountSol * 0.25),
  };
}

export function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
