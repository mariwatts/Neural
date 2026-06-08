/**
 * NEURONS (NeuralNS) — core on-chain-mirrored domain model.
 *
 * These shapes mirror the PDA account fields and AgentCard manifest defined
 * in the protocol spec (cd.md §3.1 / §3.2). The API persists a local mirror
 * of this state so the explorer, resolver and live simulation stay coherent
 * across restarts.
 */

export type Tld = '.agent';

export type AgentCategory =
  | 'base'
  | 'defi'
  | 'security'
  | 'social'
  | 'trading'
  | 'oracle'
  | 'infra'
  | 'research'
  | 'gaming'
  | 'nft'
  | 'dao'
  | 'data';

export type PriceTier = 'premium' | 'standard' | 'accessible';

/** AgentCard NFT manifest — stored on Arweave in production (cd.md §3.2). */
export interface AgentCard {
  name: string;
  symbol: 'NEURONS';
  version: string;
  description: string;
  avatarSeed: string; // deterministic seed for the generative AgentCard avatar
  capabilities: string[];
  chains: string[];
  endpoints: {
    webhook: string;
    websocket: string;
  };
  payment: {
    accepted: string[];
    perTaskUsdc: number;
  };
  saidIdentity: string; // wallet pubkey
  reputationScore: number; // 0 - 10000
  verified: boolean;
  soulbound: boolean;
  mint: string; // Token-2022 NFT mint pubkey
}

/** Mirror of the on-chain namespace PDA account (cd.md §3.1). */
export interface NameRecord {
  /** Fully-qualified name, e.g. "executor.defi.agent". */
  name: string;
  label: string; // left-most label, e.g. "executor"
  category: AgentCategory;
  tld: Tld;
  /** sha256(name) — the PDA seed material, surfaced for explorer authenticity. */
  nameHash: string;
  pda: string; // derived program address (base58)
  owner: string; // authority pubkey
  resolver: string; // wallet/program the name resolves to
  metadataUri: string; // ar:// URI to the AgentCard JSON
  expiryTimestamp: number; // unix seconds, 0 = permanent
  verified: boolean;
  linkedWallets: string[];
  tier: PriceTier;
  priceSol: number;
  card: AgentCard;
  createdAt: number; // unix ms
  updatedAt: number; // unix ms
  /** Rolling task counter — drives the "live network" feel. */
  tasksServed: number;
  /** True for real names read from the on-chain program (vs the simulation). */
  onchain?: boolean;
}

export type ActivityType =
  | 'register'
  | 'mint_card'
  | 'verify'
  | 'renew'
  | 'transfer'
  | 'link_wallet'
  | 'update_metadata'
  | 'update_resolver'
  | 'category_create'
  | 'resolve'
  | 'task';

/** A single event in the live activity stream. */
export interface ActivityEvent {
  id: string;
  type: ActivityType;
  name: string;
  category: AgentCategory;
  actor: string; // pubkey of the actor (owner / counterparty)
  counterparty?: string; // for transfers
  amountSol?: number;
  timestamp: number; // unix ms
}

/** Aggregate protocol metrics surfaced on the Stats page. */
export interface ProtocolStats {
  totalNames: number;
  verifiedAgents: number;
  categories: number;
  volumeSol: number; // cumulative registration + renewal volume
  feesBurnedSol: number; // 25% burn (cd.md §4.2)
  treasurySol: number; // 40% treasury
  stakersSol: number; // 30% to stakers
  tasksServed: number;
  registrationsByTier: Record<PriceTier, number>;
  registrationsByCategory: Record<string, number>;
}

/** The full persisted database shape (lowdb). */
export interface DbSchema {
  meta: {
    genesis: number; // unix ms of first boot
    lastTick: number; // unix ms of last simulation tick
    seeded: boolean;
    version: number;
  };
  names: NameRecord[];
  activity: ActivityEvent[];
  pricing: {
    volumeSol: number; // cumulative gross fees collected
    feesBurnedSol: number;
    treasurySol: number;
    stakersSol: number;
  };
}
