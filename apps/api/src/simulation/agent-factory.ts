import type {
  AgentCard,
  AgentCategory,
  NameRecord,
} from '../domain/types';
import { Rng } from '../domain/rng';
import {
  derivePda,
  metadataUri,
  pubkeyFromSeed,
  randomPubkey,
  sha256Hex,
} from '../domain/solana';
import { expiryFor, priceForLabel } from '../domain/pricing';
import {
  CAPABILITIES_BY_CATEGORY,
  CATEGORY_WEIGHTS,
  CHAINS,
  DESCRIPTION_TEMPLATES,
  ENDPOINT_HOSTS,
  PERSONAS,
  PREMIUM_LABELS,
} from './pools';

const SUFFIXES = [
  '',
  '',
  '',
  'x',
  'ai',
  'labs',
  'one',
  'prime',
  'zero',
  'core',
  'net',
  'hq',
  'dao',
  'fi',
];

/**
 * Build a fully-formed, human-plausible agent registration. The output mirrors
 * exactly what the on-chain program would store plus the AgentCard manifest.
 */
export function makeAgent(
  rng: Rng,
  nowMs: number,
  existing: Set<string>,
  opts: { forcePremium?: boolean } = {},
): NameRecord | null {
  const category = rng.weighted(CATEGORY_WEIGHTS) as Exclude<
    AgentCategory,
    'base'
  >;

  // Compose the left-most label.
  let label = '';
  for (let attempt = 0; attempt < 12; attempt++) {
    label = opts.forcePremium ? rng.pick(PREMIUM_LABELS) : composeLabel(rng);
    const fqn = buildFqn(label, category, rng);
    if (!existing.has(fqn)) {
      return assemble(rng, nowMs, label, category, fqn);
    }
  }
  return null; // congested namespace — skip this tick
}

function composeLabel(rng: Rng): string {
  const base = rng.pick(PERSONAS);
  const roll = rng.next();
  if (roll < 0.55) return base; // bare persona
  if (roll < 0.78) return `${base}${rng.pick(SUFFIXES)}`; // persona + suffix
  if (roll < 0.9) return `${base}-${rng.pick(PERSONAS)}`; // compound
  return `${base}${rng.int(1, 99)}`; // numbered fleet member
}

function buildFqn(
  label: string,
  category: Exclude<AgentCategory, 'base'>,
  rng: Rng,
): string {
  // ~40% of agents are base identities (label.agent); the rest are categorized
  // (label.<category>.agent) per the hierarchical scheme (cd.md §3.4).
  const categorized = rng.next() < 0.6;
  return categorized ? `${label}.${category}.agent` : `${label}.agent`;
}

function assemble(
  rng: Rng,
  nowMs: number,
  label: string,
  category: Exclude<AgentCategory, 'base'>,
  fqn: string,
): NameRecord {
  const { tier, priceSol, permanent } = priceForLabel(label);
  const nowSec = Math.floor(nowMs / 1000);

  const owner = randomPubkey();
  const resolver = rng.bool(0.85) ? owner : randomPubkey();
  const said = pubkeyFromSeed(fqn);

  const caps = rng.sample(
    CAPABILITIES_BY_CATEGORY[category],
    rng.int(2, Math.min(5, CAPABILITIES_BY_CATEGORY[category].length)),
  );
  const chains = ['solana', ...rng.sample(CHAINS.filter((c) => c !== 'solana'), rng.int(0, 2))];
  const verified = rng.next() < 0.34;
  const reputation = verified
    ? Math.round(rng.gaussian(8600, 900, 4000, 10000))
    : Math.round(rng.gaussian(5200, 1700, 200, 9600));

  const host = rng.pick(ENDPOINT_HOSTS);
  const slug = label.replace(/[^a-z0-9]/g, '');
  const card: AgentCard = {
    name: fqn,
    symbol: 'NEURONS',
    version: '1.0',
    description: rng
      .pick(DESCRIPTION_TEMPLATES)
      .replace('{cat}', category),
    avatarSeed: sha256Hex(fqn).slice(0, 16),
    capabilities: caps,
    chains,
    endpoints: {
      webhook: `https://${slug}.${host}/hook`,
      websocket: `wss://${slug}.${host}/ws`,
    },
    payment: {
      accepted: rng.bool(0.7) ? ['SOL', 'USDC'] : ['SOL'],
      perTaskUsdc: Number(rng.float(0.001, 0.25).toFixed(3)),
    },
    saidIdentity: said,
    reputationScore: reputation,
    verified,
    soulbound: rng.bool(0.45),
    mint: randomPubkey(),
  };

  const linked = rng.bool(0.25)
    ? Array.from({ length: rng.int(1, 2) }, () => randomPubkey())
    : [];

  return {
    name: fqn,
    label,
    category,
    tld: '.agent',
    nameHash: sha256Hex(fqn),
    pda: derivePda(fqn),
    owner,
    resolver,
    metadataUri: metadataUri(fqn),
    expiryTimestamp: expiryFor(permanent, nowSec),
    verified,
    linkedWallets: linked,
    tier,
    priceSol,
    card,
    createdAt: nowMs,
    updatedAt: nowMs,
    tasksServed: verified ? rng.int(5, 400) : rng.int(0, 70),
  };
}
