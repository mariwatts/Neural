import type { AgentCategory } from '../domain/types';

/**
 * Curated, believable building blocks for the agent population. The simulation
 * composes labels + categories + capabilities into names that read like real
 * autonomous agents a human operator would register (cd.md §3.4).
 */

export const CATEGORIES: Exclude<AgentCategory, 'base'>[] = [
  'defi',
  'security',
  'social',
  'trading',
  'oracle',
  'infra',
  'research',
  'gaming',
  'nft',
  'dao',
  'data',
];

/** Weighting so the distribution feels organic, not uniform. */
export const CATEGORY_WEIGHTS: Record<Exclude<AgentCategory, 'base'>, number> = {
  defi: 22,
  trading: 16,
  data: 12,
  infra: 11,
  research: 9,
  oracle: 8,
  security: 7,
  social: 6,
  nft: 4,
  dao: 3,
  gaming: 2,
};

/** Distinctive single-word agent "personas" used as the left-most label. */
export const PERSONAS: string[] = [
  'scout',
  'executor',
  'oracle',
  'sentinel',
  'archivist',
  'navigator',
  'forge',
  'cipher',
  'relay',
  'beacon',
  'warden',
  'courier',
  'atlas',
  'nomad',
  'pulse',
  'vector',
  'quanta',
  'helix',
  'prism',
  'echo',
  'drift',
  'flux',
  'nexus',
  'glyph',
  'mirror',
  'shard',
  'lattice',
  'cortex',
  'synapse',
  'phantom',
  'specter',
  'meridian',
  'horizon',
  'zephyr',
  'onyx',
  'cobalt',
  'argus',
  'hermes',
  'kepler',
  'tesseract',
  'monolith',
  'aperture',
  'fathom',
  'tempo',
  'cascade',
  'gradient',
  'lumen',
  'vertex',
  'parallax',
  'singularity',
];

/** Short / premium 1-4 char labels (the speculative tier, cd.md §5). */
export const PREMIUM_LABELS: string[] = [
  'ax',
  'nx',
  'q',
  'zk',
  'fx',
  'io',
  'vo',
  'kx',
  'om',
  'ra',
  'ix',
  'mu',
  'ev',
  'arc',
  'ion',
  'apex',
  'flux',
  'echo',
  'volt',
  'nova',
];

export const CAPABILITIES_BY_CATEGORY: Record<
  Exclude<AgentCategory, 'base'>,
  string[]
> = {
  defi: [
    'swap_routing',
    'liquidity_provision',
    'yield_optimization',
    'lending',
    'leverage_management',
    'mev_protection',
    'portfolio_rebalance',
    'stablecoin_arbitrage',
  ],
  trading: [
    'order_execution',
    'market_making',
    'arbitrage',
    'signal_generation',
    'risk_management',
    'limit_orders',
    'twap',
    'sniping',
  ],
  oracle: [
    'price_feed',
    'twap_oracle',
    'proof_of_reserve',
    'randomness',
    'cross_chain_attestation',
    'data_verification',
  ],
  security: [
    'threat_detection',
    'transaction_simulation',
    'rug_screening',
    'wallet_monitoring',
    'anomaly_detection',
    'audit_assist',
    'phishing_detection',
  ],
  social: [
    'content_generation',
    'sentiment_analysis',
    'community_moderation',
    'engagement',
    'translation',
    'summarization',
    'reply_drafting',
  ],
  infra: [
    'rpc_routing',
    'indexing',
    'data_streaming',
    'node_orchestration',
    'compute_scheduling',
    'webhook_relay',
    'state_caching',
  ],
  research: [
    'web_search',
    'extraction',
    'summarization',
    'knowledge_graph',
    'citation',
    'report_generation',
    'on_chain_forensics',
  ],
  gaming: [
    'matchmaking',
    'npc_behavior',
    'asset_pricing',
    'tournament_ops',
    'anti_cheat',
    'reward_distribution',
  ],
  nft: [
    'floor_tracking',
    'rarity_scoring',
    'mint_automation',
    'collection_analytics',
    'sweep_execution',
    'metadata_indexing',
  ],
  dao: [
    'proposal_drafting',
    'vote_delegation',
    'treasury_management',
    'governance_analytics',
    'quorum_tracking',
  ],
  data: [
    'etl',
    'labeling',
    'embedding',
    'vector_search',
    'stream_processing',
    'feature_extraction',
    'dataset_curation',
  ],
};

export const CHAINS = ['solana', 'base', 'ethereum', 'arbitrum', 'sui', 'aptos'];

/** Realistic operator domains for AgentCard endpoints. */
export const ENDPOINT_HOSTS = [
  'agent.run',
  'autonoma.xyz',
  'spawnr.io',
  'mesh.fun',
  'opmind.dev',
  'sentient.sh',
  'agentkit.ai',
  'neuralabs.io',
  'driftnet.xyz',
  'cortexlabs.gg',
];

/** Short, human-sounding descriptions for the AgentCard. */
export const DESCRIPTION_TEMPLATES = [
  'Autonomous {cat} agent operating 24/7 on Solana.',
  'Production {cat} agent with verified on-chain track record.',
  'High-frequency {cat} executor with sub-second response.',
  'Composable {cat} agent built for multi-agent workflows.',
  'Battle-tested {cat} agent serving live mainnet traffic.',
  'Self-custodial {cat} agent with capability-scoped keys.',
  'Reputation-staked {cat} agent in the NeuralNS registry.',
];
