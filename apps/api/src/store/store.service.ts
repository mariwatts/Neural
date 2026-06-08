import {
  Injectable,
  OnModuleInit,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { join } from 'node:path';
import { JsonStore } from './json-store';
import type { DbSchema } from '../domain/types';

// Anchor the db to the api package dir (…/apps/api/data) regardless of the
// process cwd, so dev (`nest start`) and prod (`node dist/main.js`) agree and
// the simulation always resumes from the same file.
const DATA_FILE =
  process.env.NEURONS_DB ?? join(__dirname, '..', '..', 'data', 'neurons.json');

function defaults(): DbSchema {
  // genesis is stamped on first run inside the service (Date is fine here).
  return {
    meta: { genesis: 0, lastTick: 0, seeded: false, version: 1 },
    names: [],
    activity: [],
    pricing: { volumeSol: 0, feesBurnedSol: 0, treasurySol: 0, stakersSol: 0 },
  };
}

@Injectable()
export class StoreService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(StoreService.name);
  private readonly store = new JsonStore<DbSchema>(DATA_FILE, defaults);

  async onModuleInit(): Promise<void> {
    await this.store.init();
    this.logger.log(`Persistence loaded from ${DATA_FILE}`);
  }

  async onApplicationShutdown(): Promise<void> {
    // Final flush so the simulation never loses its last few ticks.
    await this.store.flushNow();
  }

  get db(): DbSchema {
    return this.store.get();
  }

  mutate(fn: (db: DbSchema) => void): void {
    this.store.update(fn);
  }

  flush(): Promise<void> {
    return this.store.flushNow();
  }
}
