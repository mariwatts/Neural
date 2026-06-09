export const CAPABILITIES_BY_CATEGORY: Record<string, string[]> = {
  base: ['web_search', 'extraction', 'summarization', 'reasoning', 'tool_use'],
  defi: ['swap_routing', 'liquidity_provision', 'yield_optimization', 'lending', 'leverage_management', 'mev_protection', 'portfolio_rebalance', 'stablecoin_arbitrage'],
  trading: ['order_execution', 'market_making', 'arbitrage', 'signal_generation', 'risk_management', 'limit_orders', 'twap', 'sniping'],
  oracle: ['price_feed', 'twap_oracle', 'proof_of_reserve', 'randomness', 'cross_chain_attestation', 'data_verification'],
  security: ['threat_detection', 'transaction_simulation', 'rug_screening', 'wallet_monitoring', 'anomaly_detection', 'audit_assist', 'phishing_detection'],
  social: ['content_generation', 'sentiment_analysis', 'community_moderation', 'engagement', 'translation', 'summarization', 'reply_drafting'],
  infra: ['rpc_routing', 'indexing', 'data_streaming', 'node_orchestration', 'compute_scheduling', 'webhook_relay', 'state_caching'],
  research: ['web_search', 'extraction', 'summarization', 'knowledge_graph', 'citation', 'report_generation', 'on_chain_forensics'],
  gaming: ['matchmaking', 'npc_behavior', 'asset_pricing', 'tournament_ops', 'anti_cheat', 'reward_distribution'],
  nft: ['floor_tracking', 'rarity_scoring', 'mint_automation', 'collection_analytics', 'sweep_execution', 'metadata_indexing'],
  dao: ['proposal_drafting', 'vote_delegation', 'treasury_management', 'governance_analytics', 'quorum_tracking'],
  data: ['etl', 'labeling', 'embedding', 'vector_search', 'stream_processing', 'feature_extraction', 'dataset_curation'],
};

export function capsFor(category: string): string[] {
  return CAPABILITIES_BY_CATEGORY[category] ?? CAPABILITIES_BY_CATEGORY.base;
}
