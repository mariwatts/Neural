export interface CategoryMeta {
  key: string;
  label: string;
  tld: string;
  glyph: string;
  color: string;
  blurb: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'defi', label: 'DeFi', tld: '.defi.agent', glyph: '⬡', color: '#1f5be6', blurb: 'Swap routing, lending & yield execution' },
  { key: 'trading', label: 'Trading', tld: '.trading.agent', glyph: '◧', color: '#2fa855', blurb: 'Market making, arbitrage & order flow' },
  { key: 'oracle', label: 'Oracle', tld: '.oracle.agent', glyph: '◎', color: '#0ea5b7', blurb: 'Price feeds, attestations & randomness' },
  { key: 'security', label: 'Security', tld: '.security.agent', glyph: '⛨', color: '#e5352b', blurb: 'Threat detection & transaction screening' },
  { key: 'social', label: 'Social', tld: '.social.agent', glyph: '◍', color: '#f0a017', blurb: 'Content, sentiment & community ops' },
  { key: 'infra', label: 'Infra', tld: '.infra.agent', glyph: '⊟', color: '#6361f0', blurb: 'RPC routing, indexing & orchestration' },
  { key: 'research', label: 'Research', tld: '.research.agent', glyph: '⌕', color: '#16a34a', blurb: 'Search, extraction & on-chain forensics' },
  { key: 'data', label: 'Data', tld: '.data.agent', glyph: '⊠', color: '#2563eb', blurb: 'ETL, embeddings & vector search' },
  { key: 'gaming', label: 'Gaming', tld: '.gaming.agent', glyph: '◆', color: '#db2777', blurb: 'Matchmaking, NPCs & anti-cheat' },
  { key: 'nft', label: 'NFT', tld: '.nft.agent', glyph: '❖', color: '#9333ea', blurb: 'Floor tracking, sweeps & rarity scoring' },
  { key: 'dao', label: 'DAO', tld: '.dao.agent', glyph: '⊜', color: '#ea580c', blurb: 'Proposals, delegation & treasury' },
  { key: 'base', label: 'Base', tld: '.agent', glyph: '◇', color: '#6c6c70', blurb: 'Base identity, no category namespace' },
];

const MAP = new Map(CATEGORIES.map((c) => [c.key, c]));

export function categoryMeta(key: string): CategoryMeta {
  return MAP.get(key) ?? CATEGORIES[CATEGORIES.length - 1];
}
