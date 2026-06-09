export type PriceTier = 'premium' | 'standard' | 'accessible';

export interface AgentCard {
  name: string;
  symbol: 'NEURONS';
  version: string;
  description: string;
  avatarSeed: string;
  capabilities: string[];
  chains: string[];
  endpoints: { webhook: string; websocket: string };
  payment: { accepted: string[]; perTaskUsdc: number };
  saidIdentity: string;
  reputationScore: number;
  verified: boolean;
  soulbound: boolean;
  mint: string;
}

export interface NameRecord {
  name: string;
  label: string;
  category: string;
  tld: '.agent';
  nameHash: string;
  pda: string;
  owner: string;
  resolver: string;
  metadataUri: string;
  expiryTimestamp: number;
  verified: boolean;
  linkedWallets: string[];
  tier: PriceTier;
  priceSol: number;
  card: AgentCard;
  createdAt: number;
  updatedAt: number;
  tasksServed: number;
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

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  name: string;
  category: string;
  actor: string;
  counterparty?: string;
  amountSol?: number;
  timestamp: number;
}

export interface ProtocolStats {
  totalNames: number;
  verifiedAgents: number;
  categories: number;
  volumeSol: number;
  feesBurnedSol: number;
  treasurySol: number;
  stakersSol: number;
  tasksServed: number;
  registrationsByTier: Record<PriceTier, number>;
  registrationsByCategory: Record<string, number>;
}

export interface Availability {
  name: string;
  label: string;
  category: string;
  available: boolean;
  tier: PriceTier;
  priceSol: number;
  permanent: boolean;
  pda: string;
  nameHash: string;
}

export interface ExploreResult {
  items: NameRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TimelinePoint {
  day: number;
  count: number;
  volume: number;
}

export interface AgentDetail extends NameRecord {
  history: ActivityEvent[];
  siblings: { name: string; verified: boolean; reputationScore: number }[];
}
