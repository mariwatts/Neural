import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from '../store/store.service';
import { OnchainIndexerService } from '../indexer/onchain-indexer.service';
import { Rng } from '../domain/rng';
import {
  derivePda,
  metadataUri,
  pubkeyFromSeed,
  randomPubkey,
  sha256Hex,
} from '../domain/solana';
import {
  expiryFor,
  priceForLabel,
  round,
  splitRevenue,
} from '../domain/pricing';
import type {
  AgentCard,
  AgentCategory,
  NameRecord,
  ProtocolStats,
} from '../domain/types';
import { CAPABILITIES_BY_CATEGORY } from '../simulation/pools';

const VALID_CATEGORIES: AgentCategory[] = [
  'base',
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

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export interface ExploreQuery {
  q?: string;
  category?: string;
  tier?: string;
  verified?: string;
  onchain?: string;
  sort?: 'recent' | 'reputation' | 'tasks' | 'alpha';
  page?: number;
  pageSize?: number;
}

export interface RegisterDto {
  label: string;
  category?: AgentCategory;
  owner?: string;
  capabilities?: string[];
  endpoint?: string;
  soulbound?: boolean;
}

@Injectable()
export class RegistryService {
  private rng = new Rng(0x51ed270b);

  constructor(
    private readonly store: StoreService,
    private readonly indexer: OnchainIndexerService,
  ) {}

  // ───────────────────────────────────────────────── name normalisation ──

  /** Turn user input ("scout", "scout.defi", "scout.defi.agent") into a FQN. */
  normalize(input: string, category?: string): { fqn: string; label: string; cat: AgentCategory } {
    let raw = (input || '').trim().toLowerCase();
    raw = raw.replace(/\.agent$/, '');
    const parts = raw.split('.').filter(Boolean);
    const label = parts[0] ?? '';
    let cat: AgentCategory = 'base';

    if (parts[1] && VALID_CATEGORIES.includes(parts[1] as AgentCategory)) {
      cat = parts[1] as AgentCategory;
    } else if (category && VALID_CATEGORIES.includes(category as AgentCategory)) {
      cat = category as AgentCategory;
    }

    if (!LABEL_RE.test(label)) {
      throw new BadRequestException(
        'Invalid label: use 1–32 chars, a–z, 0–9 and hyphens (not leading/trailing).',
      );
    }

    const fqn = cat === 'base' ? `${label}.agent` : `${label}.${cat}.agent`;
    return { fqn, label, cat };
  }

  // ─────────────────────────────────────────────────────────── queries ──

  private get names(): NameRecord[] {
    // On-chain registrations ONLY — the registry shows nothing that isn't real.
    // The local store is used purely to enrich a name with the AgentCard
    // manifest (capabilities, endpoints) submitted at registration time.
    return this.indexer.getNames().map((n) => {
      const manifest = this.store.db.names.find((s) => s.name === n.name);
      if (!manifest) return n;
      return {
        ...n,
        card: {
          ...n.card,
          description: manifest.card.description,
          capabilities: manifest.card.capabilities,
          endpoints: manifest.card.endpoints,
          soulbound: manifest.card.soulbound,
        },
      };
    });
  }

  getByName(name: string): NameRecord | undefined {
    const target = name.trim().toLowerCase();
    return this.names.find((n) => n.name === target);
  }

  /** Forward resolution: name.agent → wallet + metadata (cd.md §3.3). */
  resolve(name: string) {
    const rec = this.getByName(this.normalizeFqn(name));
    if (!rec) throw new NotFoundException(`Name not registered: ${name}`);
    return {
      name: rec.name,
      owner: rec.owner,
      resolver: rec.resolver,
      metadataUri: rec.metadataUri,
      pda: rec.pda,
      verified: rec.verified,
      reputationScore: rec.card.reputationScore,
      expiryTimestamp: rec.expiryTimestamp,
      capabilities: rec.card.capabilities,
    };
  }

  /** Reverse resolution: wallet → primary name (highest reputation owned). */
  reverse(wallet: string) {
    const owned = this.names.filter(
      (n) => n.owner === wallet || n.linkedWallets.includes(wallet),
    );
    if (owned.length === 0)
      throw new NotFoundException(`No name resolves for wallet: ${wallet}`);
    owned.sort((a, b) => b.card.reputationScore - a.card.reputationScore);
    return { wallet, primary: owned[0].name, count: owned.length };
  }

  capabilities(name: string): AgentCard & { image: string; external_url: string } {
    const rec = this.getByName(this.normalizeFqn(name));
    if (!rec) throw new NotFoundException(`Name not registered: ${name}`);
    // Metaplex-display extras so wallets fetching this URI render the NFT
    // (some already-minted AgentCards point their token metadata here).
    const site = process.env.PUBLIC_SITE_URL || 'https://neuralns.xyz';
    return {
      ...rec.card,
      image: `${site}/agentcard.png`,
      external_url: `${site}/agent/${rec.name}`,
    };
  }

  /**
   * Metaplex-standard NFT JSON for the AgentCard — this is what Phantom and
   * marketplaces fetch from the token-metadata URI. Always answers 200 (even
   * for names only known on-chain) so a minted NFT never renders blank.
   */
  cardJson(name: string) {
    const fqn = this.normalizeFqn(name);
    const rec = this.getByName(fqn);
    const site = process.env.PUBLIC_SITE_URL || 'https://neuralns.xyz';
    return {
      name: fqn,
      symbol: 'NEURONS',
      description:
        rec?.card.description ||
        `AgentCard for ${fqn} — on-chain identity in the NeuralNS .agent namespace on Solana.`,
      image: `${site}/agentcard.png`,
      external_url: `${site}/agent/${fqn}`,
      attributes: [
        { trait_type: 'tier', value: rec?.tier ?? 'unknown' },
        { trait_type: 'category', value: rec?.category ?? 'base' },
        { trait_type: 'verified', value: String(rec?.verified ?? false) },
        ...(rec?.card.capabilities ?? []).map((c) => ({
          trait_type: 'capability',
          value: c,
        })),
      ],
      properties: {
        category: 'image',
        files: [{ uri: `${site}/agentcard.png`, type: 'image/png' }],
      },
    };
  }

  /** Full record + recent activity for the agent detail page. */
  resolveFull(name: string) {
    const rec = this.getByName(this.normalizeFqn(name));
    if (!rec) throw new NotFoundException(`Name not registered: ${name}`);
    const history = this.store.db.activity
      .filter((e) => e.name === rec.name)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);
    const siblings = this.names
      .filter((n) => n.category === rec.category && n.name !== rec.name)
      .sort((a, b) => b.card.reputationScore - a.card.reputationScore)
      .slice(0, 5)
      .map((n) => ({
        name: n.name,
        verified: n.verified,
        reputationScore: n.card.reputationScore,
      }));
    return { ...rec, history, siblings };
  }

  namesByWallet(wallet: string): NameRecord[] {
    return this.names
      .filter((n) => n.owner === wallet || n.linkedWallets.includes(wallet))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  discover(opts: { capability?: string; category?: string; limit?: number }) {
    const limit = Math.min(opts.limit ?? 50, 200);
    let res = [...this.names];
    if (opts.capability) {
      const cap = opts.capability.toLowerCase();
      res = res.filter((n) =>
        n.card.capabilities.some((c) => c.includes(cap)),
      );
    }
    if (opts.category) {
      res = res.filter((n) => n.category === opts.category);
    }
    res.sort((a, b) => b.card.reputationScore - a.card.reputationScore);
    return res.slice(0, limit);
  }

  explore(query: ExploreQuery) {
    let res = [...this.names];

    if (query.q) {
      const q = query.q.trim().toLowerCase();
      res = res.filter(
        (n) =>
          n.name.includes(q) ||
          n.card.capabilities.some((c) => c.includes(q)) ||
          n.owner.toLowerCase().startsWith(q),
      );
    }
    if (query.category && query.category !== 'all') {
      res = res.filter((n) => n.category === query.category);
    }
    if (query.tier && query.tier !== 'all') {
      res = res.filter((n) => n.tier === query.tier);
    }
    if (query.verified === 'true') {
      res = res.filter((n) => n.verified);
    }
    if (query.onchain === 'true') {
      res = res.filter((n) => n.onchain);
    }

    const sort = query.sort ?? 'recent';
    const by = (a: NameRecord, b: NameRecord): number => {
      switch (sort) {
        case 'reputation':
          return b.card.reputationScore - a.card.reputationScore;
        case 'tasks':
          return b.tasksServed - a.tasksServed;
        case 'alpha':
          return a.name.localeCompare(b.name);
        default:
          return b.createdAt - a.createdAt;
      }
    };
    // Real on-chain registrations are pinned above the simulated preview.
    res.sort((a, b) => (b.onchain ? 1 : 0) - (a.onchain ? 1 : 0) || by(a, b));

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(Math.max(1, Number(query.pageSize) || 24), 100);
    const total = res.length;
    const items = res.slice((page - 1) * pageSize, page * pageSize);
    return { items, total, page, pageSize };
  }

  leaderboard(limit = 12) {
    return [...this.names]
      .sort(
        (a, b) =>
          b.card.reputationScore - a.card.reputationScore ||
          b.tasksServed - a.tasksServed,
      )
      .slice(0, limit);
  }

  getActivity(limit = 40, type?: string) {
    // Only events for names that actually exist on-chain.
    const onchain = new Set(this.indexer.getNames().map((n) => n.name));
    let feed = this.store.db.activity.filter((e) => onchain.has(e.name));
    if (type && type !== 'all') feed = feed.filter((e) => e.type === type);
    return feed
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, Math.min(limit, 200));
  }

  categories() {
    const counts: Record<string, number> = {};
    for (const n of this.names) counts[n.category] = (counts[n.category] ?? 0) + 1;
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** Availability check for the register flow. */
  async availability(input: string, category?: string) {
    const { fqn, label, cat } = this.normalize(input, category);
    let taken = !!this.getByName(fqn);
    if (!taken) {
      // Not in memory — sync with the chain (throttled) so a name registered
      // seconds ago never shows as available.
      await this.indexer.refreshIfStale(4000);
      taken = !!this.getByName(fqn);
    }
    const pricing = priceForLabel(label);
    return {
      name: fqn,
      label,
      category: cat,
      available: !taken,
      tier: pricing.tier,
      priceSol: pricing.priceSol,
      permanent: pricing.permanent,
      pda: derivePda(fqn),
      nameHash: sha256Hex(fqn),
    };
  }

  stats(): ProtocolStats {
    const names = this.names;
    const byTier = { premium: 0, standard: 0, accessible: 0 };
    const byCat: Record<string, number> = {};
    let verified = 0;
    let tasks = 0;
    for (const n of names) {
      byTier[n.tier]++;
      byCat[n.category] = (byCat[n.category] ?? 0) + 1;
      if (n.verified) verified++;
      tasks += n.tasksServed;
    }
    // Volume derived from the real on-chain registrations (tier price each),
    // split per the protocol's 40/30/25 revenue distribution.
    const volume = round(names.reduce((s, n) => s + n.priceSol, 0), 4);
    const split = splitRevenue(volume);
    return {
      totalNames: names.length,
      verifiedAgents: verified,
      categories: Object.keys(byCat).length,
      volumeSol: volume,
      feesBurnedSol: split.burned,
      treasurySol: split.treasury,
      stakersSol: split.stakers,
      tasksServed: tasks,
      registrationsByTier: byTier,
      registrationsByCategory: byCat,
    };
  }

  /** Daily registration counts for the last `days` days (for the stats chart). */
  registrationsTimeline(days = 30) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const buckets: { day: number; count: number; volume: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = now - (i + 1) * dayMs;
      const end = now - i * dayMs;
      const inRange = this.names.filter(
        (n) => n.createdAt >= start && n.createdAt < end,
      );
      buckets.push({
        day: end,
        count: inRange.length,
        volume: round(inRange.reduce((s, n) => s + n.priceSol, 0), 2),
      });
    }
    return buckets;
  }

  // ─────────────────────────────────────────────────────── mutations ──

  /** Minimal working registration — actually persists a user-claimed name. */
  register(dto: RegisterDto): NameRecord {
    const { fqn, label, cat } = this.normalize(dto.label, dto.category);
    if (this.getByName(fqn)) {
      throw new BadRequestException(`Name already registered: ${fqn}`);
    }

    const now = Date.now();
    const nowSec = Math.floor(now / 1000);
    const pricing = priceForLabel(label);
    const owner = dto.owner?.trim() || randomPubkey();

    const caps =
      dto.capabilities && dto.capabilities.length
        ? dto.capabilities.slice(0, 8)
        : cat === 'base'
          ? ['web_search', 'summarization']
          : (CAPABILITIES_BY_CATEGORY[cat] ?? ['web_search']).slice(0, 3);

    const host = (dto.endpoint || '').replace(/^https?:\/\//, '') || `${label}.agent.run`;
    const card: AgentCard = {
      name: fqn,
      symbol: 'NEURONS',
      version: '1.0',
      description: `Registered via the NeuralNS web app — ${cat} agent.`,
      avatarSeed: sha256Hex(fqn).slice(0, 16),
      capabilities: caps,
      chains: ['solana'],
      endpoints: {
        webhook: dto.endpoint || `https://${host}/hook`,
        websocket: `wss://${host}/ws`,
      },
      payment: { accepted: ['SOL', 'USDC'], perTaskUsdc: 0.01 },
      saidIdentity: pubkeyFromSeed(fqn),
      reputationScore: 1000,
      verified: false,
      soulbound: !!dto.soulbound,
      mint: randomPubkey(),
    };

    const rec: NameRecord = {
      name: fqn,
      label,
      category: cat,
      tld: '.agent',
      nameHash: sha256Hex(fqn),
      pda: derivePda(fqn),
      owner,
      resolver: owner,
      metadataUri: metadataUri(fqn),
      expiryTimestamp: expiryFor(pricing.permanent, nowSec),
      verified: false,
      linkedWallets: [],
      tier: pricing.tier,
      priceSol: pricing.priceSol,
      card,
      createdAt: now,
      updatedAt: now,
      tasksServed: 0,
    };

    this.store.mutate((db) => {
      db.names.push(rec);
      const split = splitRevenue(rec.priceSol);
      db.pricing.volumeSol = round(db.pricing.volumeSol + rec.priceSol);
      db.pricing.treasurySol = round(db.pricing.treasurySol + split.treasury);
      db.pricing.stakersSol = round(db.pricing.stakersSol + split.stakers);
      db.pricing.feesBurnedSol = round(db.pricing.feesBurnedSol + split.burned);
      db.activity.push({
        id: sha256Hex(`${fqn}:${now}`).slice(0, 24),
        type: 'register',
        name: fqn,
        category: cat,
        actor: owner,
        amountSol: rec.priceSol,
        timestamp: now,
      });
    });

    return rec;
  }

  private normalizeFqn(name: string): string {
    const raw = name.trim().toLowerCase();
    return raw.endsWith('.agent') ? raw : `${raw}.agent`;
  }
}
