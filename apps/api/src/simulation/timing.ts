import { Rng } from '../domain/rng';

/**
 * Diurnal activity multipliers by UTC hour. Models a global-but-US/EU-skewed
 * crypto audience: a deep lull around 06:00-09:00 UTC, a long ramp through the
 * Americas afternoon/evening. Peak ~1.0, trough ~0.28. This is what stops the
 * activity feed from looking like a metronome — events ebb and flow with the
 * clock just like a real user base.
 */
export const DIURNAL: number[] = [
  0.62, 0.5, 0.42, 0.36, 0.32, 0.3, 0.28, 0.31, 0.4, 0.52, 0.63, 0.72, 0.8,
  0.86, 0.92, 0.97, 1.0, 0.99, 0.95, 0.9, 0.86, 0.82, 0.76, 0.7,
];

export function diurnalMultiplier(date: Date): number {
  const h = date.getUTCHours();
  const next = DIURNAL[(h + 1) % 24];
  const cur = DIURNAL[h];
  const frac = date.getUTCMinutes() / 60;
  return cur + (next - cur) * frac; // smooth interpolation between hours
}

/**
 * Draw a Poisson-distributed count (Knuth's algorithm) for the number of
 * events arriving in a window — true Poisson arrivals, not a fixed cadence.
 */
export function poisson(lambda: number, rng: Rng): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L);
  return k - 1;
}
