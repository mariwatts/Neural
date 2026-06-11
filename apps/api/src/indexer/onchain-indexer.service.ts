import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { base58encode, sha256Hex } from '../domain/solana';
import { priceForLabel } from '../domain/pricing';
import { StoreService } from '../store/store.service';
import type { AgentCategory, NameRecord } from '../domain/types';

const PROGRAM_ID = '5dqCWiZvLWD1Nge15UhXyGCGd2rF8uN6nPigdnLRWCv1';
const RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
// v2: ver(1) bump(1) owner(32) resolver(32) expiry(8) verified(1) card(32) + name(4+64) + uri(4+200)
const RECORD_SIZE = 379;
const YEAR = 31_536_000;

const VALID = new Set<string>([
  'defi', 'security', 'social', 'trading', 'oracle',
  'infra', 'research', 'gaming', 'nft', 'dao', 'data',
]);

/**
 * Reads the REAL names registered in the on-chain program (getProgramAccounts),
 * decodes the NameRecord layout and exposes them so the registry/explore can
 * surface actual mainnet registrations — not just the simulation.
 */
@Injectable()
export class OnchainIndexerService implements OnModuleInit {
  private readonly logger = new Logger(OnchainIndexerService.name);
  private records: NameRecord[] = [];
  private seen = new Set<string>();
  private firstLoadDone = false;
  private lastRefreshAt = 0;

  constructor(private readonly store: StoreService) {}

  async onModuleInit(): Promise<void> {
    await this.refresh().catch((e) =>
      this.logger.warn(`initial index failed: ${e?.message ?? e}`),
    );
  }

  getNames(): NameRecord[] {
    return this.records;
  }

  /** Refresh at most once per `maxAgeMs` — used by the availability check. */
  async refreshIfStale(maxAgeMs = 5000): Promise<void> {
    if (Date.now() - this.lastRefreshAt < maxAgeMs) return;
    await this.refresh().catch(() => {});
  }

  @Interval('neurons-indexer', 25_000)
  async tick(): Promise<void> {
    await this.refresh().catch(() => {});
  }

  async refresh(): Promise<number> {
    this.lastRefreshAt = Date.now();
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [PROGRAM_ID, { encoding: 'base64', filters: [{ dataSize: RECORD_SIZE }] }],
      }),
    });
    const json = (await res.json()) as {
      result?: { pubkey: string; account: { data: [string, string] } }[];
    };
    const accounts = json?.result;
    if (!Array.isArray(accounts)) return this.records.length;

    const out: NameRecord[] = [];
    const fresh: NameRecord[] = [];
    for (const a of accounts) {
      const rec = this.decode(a.pubkey, a.account?.data?.[0]);
      if (!rec) continue;
      out.push(rec);
      if (!this.seen.has(rec.name)) {
        this.seen.add(rec.name);
        fresh.push(rec);
      }
    }
    out.sort((x, y) => y.createdAt - x.createdAt);
    this.records = out;

    // Surface freshly-registered names in the live activity feed (only recent,
    // and never on the very first load so a restart doesn't replay history).
    if (this.firstLoadDone && fresh.length) {
      const now = Date.now();
      this.store.mutate((db) => {
        for (const r of fresh) {
          if (now - r.createdAt < 20 * 60 * 1000) {
            db.activity.push({
              id: randomUUID(),
              type: 'register',
              name: r.name,
              category: r.category,
              actor: r.owner,
              amountSol: r.priceSol,
              timestamp: now,
            });
          }
        }
      });
    }
    this.firstLoadDone = true;
    if (fresh.length) this.logger.log(`indexed ${out.length} on-chain names (+${fresh.length} new)`);
    return out.length;
  }

  private decode(pubkey: string, dataB64?: string): NameRecord | null {
    if (!dataB64) return null;
    const buf = Buffer.from(dataB64, 'base64');
    if (buf.length < 115 || buf[0] !== 2) return null; // v2 records only
    const owner = base58encode(buf.subarray(2, 34));
    const resolver = base58encode(buf.subarray(34, 66));
    const expiry = Number(buf.readBigInt64LE(66));
    const verified = buf[74] === 1;
    const cardMintRaw = buf.subarray(75, 107);
    const hasCard = cardMintRaw.some((b) => b !== 0);
    const cardMint = hasCard ? base58encode(cardMintRaw) : '';
    const nlen = buf.readUInt32LE(107);
    if (nlen === 0 || nlen > 64 || 111 + nlen + 4 > buf.length) return null;
    const name = buf.subarray(111, 111 + nlen).toString('utf8');
    if (!name.endsWith('.agent')) return null;
    const ulen = buf.readUInt32LE(111 + nlen);
    const uriStart = 115 + nlen;
    const metadataUri =
      ulen > 0 && uriStart + ulen <= buf.length
        ? buf.subarray(uriStart, uriStart + ulen).toString('utf8')
        : '';

    const bare = name.replace(/\.agent$/, '');
    const parts = bare.split('.');
    const label = parts[0];
    const category = (parts[1] && VALID.has(parts[1]) ? parts[1] : 'base') as AgentCategory;
    const { tier, priceSol } = priceForLabel(label);
    const createdAt = expiry > 0 ? (expiry - YEAR) * 1000 : Date.now();

    return {
      name,
      label,
      category,
      tld: '.agent',
      nameHash: sha256Hex(name),
      pda: pubkey,
      owner,
      resolver,
      metadataUri,
      expiryTimestamp: expiry,
      verified,
      linkedWallets: [],
      tier,
      priceSol,
      card: {
        name,
        symbol: 'NEURONS',
        version: '2.0',
        description: 'Registered on-chain via NeuralNS on Solana mainnet.',
        avatarSeed: sha256Hex(name).slice(0, 16),
        capabilities: [],
        chains: ['solana'],
        endpoints: { webhook: '', websocket: '' },
        payment: { accepted: ['SOL', 'NEURONS'], perTaskUsdc: 0 },
        saidIdentity: owner,
        reputationScore: 0,
        verified,
        soulbound: false,
        mint: cardMint || pubkey,
      },
      createdAt,
      updatedAt: createdAt,
      tasksServed: 0,
      onchain: true,
    };
  }
}
