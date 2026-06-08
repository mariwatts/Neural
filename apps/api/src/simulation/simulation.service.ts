import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { StoreService } from '../store/store.service';
import { Rng } from '../domain/rng';
import { randomPubkey } from '../domain/solana';
import {
  RENEW_FEE_SOL,
  VERIFY_FEE_SOL,
  round,
  splitRevenue,
} from '../domain/pricing';
import type {
  ActivityEvent,
  ActivityType,
  DbSchema,
  NameRecord,
} from '../domain/types';
import { makeAgent } from './agent-factory';
import { CATEGORIES } from './pools';
import { diurnalMultiplier, poisson } from './timing';

const TICK_MS = 4000;
const PEAK_EVENTS_PER_MIN = 7; // throughput at the diurnal peak (kept modest/realistic)
const SOFT_TARGET_NAMES = 620; // adoption soft-cap that tapers new mints
const MAX_ACTIVITY = 1200; // ring buffer for the live feed
const SEED_NAMES = 280; // initial backlog so the registry has real history
const SEED_WINDOW_DAYS = 30;
const MAX_CATCHUP_EVENTS = 240; // bound the "world kept turning" replay

/** Relative likelihood of each action a live operator/agent performs. */
const BASE_WEIGHTS: Record<ActivityType, number> = {
  task: 56,
  register: 16,
  resolve: 8,
  verify: 5,
  renew: 4,
  mint_card: 3,
  update_metadata: 2,
  transfer: 2,
  link_wallet: 1.5,
  update_resolver: 1,
  category_create: 0.4,
};

@Injectable()
export class SimulationService implements OnModuleInit {
  private readonly logger = new Logger(SimulationService.name);
  private readonly rng = new Rng(0x9e3779b9 ^ 0x1234abcd);
  /** Fast membership set kept in sync with db.names for O(1) uniqueness. */
  private taken = new Set<string>();

  constructor(private readonly store: StoreService) {}

  async onModuleInit(): Promise<void> {
    const db = this.store.db;
    this.taken = new Set(db.names.map((n) => n.name));

    if (!db.meta.seeded) {
      this.seed();
    } else {
      this.catchUp();
    }
    await this.store.flush();
  }

  // ─────────────────────────────────────────────────────────── seeding ──

  private seed(): void {
    const now = Date.now();
    const windowMs = SEED_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    this.logger.log(`Seeding ${SEED_NAMES} agents over ${SEED_WINDOW_DAYS}d…`);

    this.store.mutate((db) => {
      db.meta.genesis = now - windowMs;

      // Registrations distributed across the window with an adoption ramp:
      // more recent timestamps are denser (quadratic skew toward "now").
      for (let i = 0; i < SEED_NAMES; i++) {
        const t = Math.pow(this.rng.next(), 0.6); // skew toward 1 (recent)
        const at = db.meta.genesis + Math.floor(t * windowMs);
        this.applyEvent(db, 'register', at, { silent: i < SEED_NAMES - 240 });
      }

      // A handful of premium short names for the speculative tier.
      for (let i = 0; i < 14; i++) {
        this.applyEvent(db, 'register', now - this.rng.int(0, windowMs), {
          forcePremium: true,
          silent: true,
        });
      }

      // Backfill a believable recent stream of non-registration actions.
      const recentStart = now - 6 * 60 * 60 * 1000;
      for (let i = 0; i < 420; i++) {
        const at = recentStart + Math.floor(this.rng.next() * (now - recentStart));
        const type = this.pickType(db, { excludeRegister: this.rng.bool(0.6) });
        this.applyEvent(db, type, at, { silent: false });
      }

      db.activity.sort((a, b) => a.timestamp - b.timestamp);
      this.trimActivity(db);
      db.meta.seeded = true;
      db.meta.lastTick = now;
    });

    this.logger.log(`Seed complete — ${this.taken.size} names live.`);
  }

  /** Replay an approximate amount of activity for time the server was offline. */
  private catchUp(): void {
    const now = Date.now();
    const last = this.store.db.meta.lastTick || now;
    const elapsedMin = (now - last) / 60000;
    if (elapsedMin < 0.5) return;

    const avgDiurnal = 0.68;
    const expected = Math.min(
      MAX_CATCHUP_EVENTS,
      Math.floor(elapsedMin * PEAK_EVENTS_PER_MIN * avgDiurnal),
    );
    if (expected <= 0) return;

    this.logger.log(
      `Resuming: replaying ~${expected} events for ${elapsedMin.toFixed(
        1,
      )}m offline.`,
    );
    this.store.mutate((db) => {
      for (let i = 0; i < expected; i++) {
        const at = last + Math.floor((i / expected) * (now - last));
        const type = this.pickType(db);
        this.applyEvent(db, type, at, { silent: false });
      }
      this.trimActivity(db);
      db.meta.lastTick = now;
    });
  }

  // ──────────────────────────────────────────────────────────── live tick ──

  @Interval('neurons-sim', TICK_MS)
  tick(): void {
    const now = new Date();
    const tickMin = TICK_MS / 60000;
    let lambda =
      PEAK_EVENTS_PER_MIN *
      diurnalMultiplier(now) *
      tickMin *
      this.rng.float(0.75, 1.25); // minute-to-minute jitter

    // Rare organic bursts: a fleet deployment / category launch.
    if (this.rng.next() < 0.04) lambda *= this.rng.float(2.2, 4.5);

    const count = poisson(lambda, this.rng);
    if (count <= 0) {
      this.store.mutate((db) => (db.meta.lastTick = now.getTime()));
      return;
    }

    const nowMs = now.getTime();
    this.store.mutate((db) => {
      for (let i = 0; i < count; i++) {
        const type = this.pickType(db);
        // micro-jitter timestamps within the tick so they don't collide
        this.applyEvent(db, type, nowMs - this.rng.int(0, TICK_MS - 1));
      }
      this.trimActivity(db);
      db.meta.lastTick = nowMs;
    });
  }

  // ─────────────────────────────────────────────────────── event dispatch ──

  private pickType(
    db: DbSchema,
    opts: { excludeRegister?: boolean } = {},
  ): ActivityType {
    const taper = Math.max(
      0.05,
      1 - db.names.length / SOFT_TARGET_NAMES,
    );
    const weights: Record<string, number> = { ...BASE_WEIGHTS };
    weights.register = opts.excludeRegister
      ? 0
      : BASE_WEIGHTS.register * taper;
    // mint_card only makes sense alongside fresh registrations
    weights.mint_card = BASE_WEIGHTS.mint_card * taper;
    if (db.names.length === 0) {
      return 'register';
    }
    return this.rng.weighted(weights as Record<ActivityType, number>);
  }

  private applyEvent(
    db: DbSchema,
    type: ActivityType,
    atMs: number,
    opts: { silent?: boolean; forcePremium?: boolean } = {},
  ): void {
    switch (type) {
      case 'register':
      case 'mint_card':
        return this.doRegister(db, atMs, opts);
      case 'task':
        return this.doTask(db, atMs, opts.silent);
      case 'verify':
        return this.doVerify(db, atMs, opts.silent);
      case 'renew':
        return this.doRenew(db, atMs, opts.silent);
      case 'transfer':
        return this.doTransfer(db, atMs, opts.silent);
      case 'link_wallet':
        return this.doLinkWallet(db, atMs, opts.silent);
      case 'update_metadata':
        return this.doUpdateMetadata(db, atMs, opts.silent);
      case 'update_resolver':
        return this.doUpdateResolver(db, atMs, opts.silent);
      case 'category_create':
        return this.doCategoryCreate(db, atMs, opts.silent);
      case 'resolve':
        return this.doResolve(db, atMs, opts.silent);
    }
  }

  private doRegister(
    db: DbSchema,
    atMs: number,
    opts: { silent?: boolean; forcePremium?: boolean },
  ): void {
    const agent = makeAgent(this.rng, atMs, this.taken, {
      forcePremium: opts.forcePremium,
    });
    if (!agent) return;
    this.taken.add(agent.name);
    db.names.push(agent);
    this.collectFee(db, agent.priceSol);
    if (!opts.silent) {
      this.push(db, {
        type: 'register',
        name: agent.name,
        category: agent.category,
        actor: agent.owner,
        amountSol: agent.priceSol,
        timestamp: atMs,
      });
      // A registration usually mints the AgentCard in the same flow.
      if (this.rng.bool(0.8)) {
        this.push(db, {
          type: 'mint_card',
          name: agent.name,
          category: agent.category,
          actor: agent.owner,
          timestamp: atMs + 1,
        });
      }
    }
  }

  private doTask(db: DbSchema, atMs: number, silent?: boolean): void {
    const rec = this.pickActiveAgent(db);
    if (!rec) return;
    const n = this.rng.int(1, 6);
    rec.tasksServed += n;
    rec.updatedAt = atMs;
    if (!silent) {
      this.push(db, {
        type: 'task',
        name: rec.name,
        category: rec.category,
        actor: rec.resolver,
        amountSol: round(rec.card.payment.perTaskUsdc * n * 0.006, 5), // ~USDC→SOL
        timestamp: atMs,
      });
    }
  }

  private doVerify(db: DbSchema, atMs: number, silent?: boolean): void {
    const rec = this.pickAgent(db, (r) => !r.verified);
    if (!rec) return;
    rec.verified = true;
    rec.card.verified = true;
    rec.card.reputationScore = Math.min(
      10000,
      rec.card.reputationScore + this.rng.int(300, 1200),
    );
    rec.updatedAt = atMs;
    this.collectFee(db, VERIFY_FEE_SOL);
    if (!silent) {
      this.push(db, {
        type: 'verify',
        name: rec.name,
        category: rec.category,
        actor: rec.owner,
        amountSol: VERIFY_FEE_SOL,
        timestamp: atMs,
      });
    }
  }

  private doRenew(db: DbSchema, atMs: number, silent?: boolean): void {
    const rec = this.pickAgent(db, (r) => r.expiryTimestamp !== 0);
    if (!rec) return;
    rec.expiryTimestamp += 365 * 24 * 60 * 60;
    rec.updatedAt = atMs;
    this.collectFee(db, RENEW_FEE_SOL);
    if (!silent) {
      this.push(db, {
        type: 'renew',
        name: rec.name,
        category: rec.category,
        actor: rec.owner,
        amountSol: RENEW_FEE_SOL,
        timestamp: atMs,
      });
    }
  }

  private doTransfer(db: DbSchema, atMs: number, silent?: boolean): void {
    const rec = this.pickAgent(db);
    if (!rec) return;
    const to = randomPubkey();
    const from = rec.owner;
    rec.owner = to;
    if (this.rng.bool(0.6)) rec.resolver = to;
    rec.updatedAt = atMs;
    if (!silent) {
      this.push(db, {
        type: 'transfer',
        name: rec.name,
        category: rec.category,
        actor: from,
        counterparty: to,
        timestamp: atMs,
      });
    }
  }

  private doLinkWallet(db: DbSchema, atMs: number, silent?: boolean): void {
    const rec = this.pickAgent(db, (r) => r.linkedWallets.length < 4);
    if (!rec) return;
    const w = randomPubkey();
    rec.linkedWallets.push(w);
    rec.updatedAt = atMs;
    if (!silent) {
      this.push(db, {
        type: 'link_wallet',
        name: rec.name,
        category: rec.category,
        actor: rec.owner,
        counterparty: w,
        timestamp: atMs,
      });
    }
  }

  private doUpdateMetadata(db: DbSchema, atMs: number, silent?: boolean): void {
    const rec = this.pickAgent(db);
    if (!rec) return;
    const minor = Number(rec.card.version.split('.')[1] ?? '0') + 1;
    rec.card.version = `1.${minor}`;
    rec.updatedAt = atMs;
    if (!silent) {
      this.push(db, {
        type: 'update_metadata',
        name: rec.name,
        category: rec.category,
        actor: rec.owner,
        timestamp: atMs,
      });
    }
  }

  private doUpdateResolver(db: DbSchema, atMs: number, silent?: boolean): void {
    const rec = this.pickAgent(db);
    if (!rec) return;
    rec.resolver = randomPubkey();
    rec.updatedAt = atMs;
    if (!silent) {
      this.push(db, {
        type: 'update_resolver',
        name: rec.name,
        category: rec.category,
        actor: rec.owner,
        timestamp: atMs,
      });
    }
  }

  private doCategoryCreate(db: DbSchema, atMs: number, silent?: boolean): void {
    const cat = this.rng.pick(CATEGORIES);
    if (!silent) {
      this.push(db, {
        type: 'category_create',
        name: `${cat}.agent`,
        category: cat,
        actor: randomPubkey(),
        timestamp: atMs,
      });
    }
  }

  private doResolve(db: DbSchema, atMs: number, silent?: boolean): void {
    const rec = this.pickActiveAgent(db);
    if (!rec || silent) return;
    this.push(db, {
      type: 'resolve',
      name: rec.name,
      category: rec.category,
      actor: randomPubkey(),
      timestamp: atMs,
    });
  }

  // ───────────────────────────────────────────────────────────── helpers ──

  private collectFee(db: DbSchema, amountSol: number): void {
    if (amountSol <= 0) return;
    const split = splitRevenue(amountSol);
    db.pricing.volumeSol = round(db.pricing.volumeSol + amountSol);
    db.pricing.treasurySol = round(db.pricing.treasurySol + split.treasury);
    db.pricing.stakersSol = round(db.pricing.stakersSol + split.stakers);
    db.pricing.feesBurnedSol = round(db.pricing.feesBurnedSol + split.burned);
  }

  private pickAgent(
    db: DbSchema,
    predicate?: (r: NameRecord) => boolean,
  ): NameRecord | null {
    if (db.names.length === 0) return null;
    for (let i = 0; i < 8; i++) {
      const rec = db.names[this.rng.int(0, db.names.length - 1)];
      if (!predicate || predicate(rec)) return rec;
    }
    return null;
  }

  /** Weighted toward verified, high-reputation agents — they do most work. */
  private pickActiveAgent(db: DbSchema): NameRecord | null {
    if (db.names.length === 0) return null;
    let best: NameRecord | null = null;
    let bestScore = -1;
    for (let i = 0; i < 5; i++) {
      const rec = db.names[this.rng.int(0, db.names.length - 1)];
      const w =
        (1 + rec.card.reputationScore / 1500 + (rec.verified ? 2.5 : 0)) *
        this.rng.next();
      if (w > bestScore) {
        bestScore = w;
        best = rec;
      }
    }
    return best;
  }

  private push(db: DbSchema, ev: Omit<ActivityEvent, 'id'>): void {
    db.activity.push({ id: randomUUID(), ...ev });
  }

  private trimActivity(db: DbSchema): void {
    if (db.activity.length > MAX_ACTIVITY) {
      db.activity.splice(0, db.activity.length - MAX_ACTIVITY);
    }
  }
}
