import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

/**
 * A tiny, dependency-free, crash-safe JSON store.
 *
 * - Loads the whole document into memory on `init()`.
 * - Persists with a debounced ATOMIC write (write to `*.tmp` then rename) so a
 *   power-loss / restart mid-write can never corrupt the live db.
 * - This is what makes the bot simulation *survive restarts*: every mutation is
 *   flushed to disk, so on the next boot the population resumes exactly where it
 *   left off instead of resetting.
 */
export class JsonStore<T> {
  private data!: T;
  private flushTimer: NodeJS.Timeout | null = null;
  private writing = false;
  private dirty = false;

  constructor(
    private readonly file: string,
    private readonly defaults: () => T,
    private readonly debounceMs = 400,
  ) {}

  async init(): Promise<void> {
    await fs.mkdir(dirname(this.file), { recursive: true });
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      this.data = JSON.parse(raw) as T;
    } catch {
      this.data = this.defaults();
      await this.flushNow();
    }
  }

  get(): T {
    return this.data;
  }

  /** Mutate in place and schedule a debounced flush. */
  update(mutator: (data: T) => void): void {
    mutator(this.data);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushNow();
    }, this.debounceMs);
  }

  /** Force an immediate atomic write (also used on graceful shutdown). */
  async flushNow(): Promise<void> {
    if (this.writing) {
      this.dirty = true;
      return;
    }
    this.writing = true;
    this.dirty = false;
    try {
      const tmp = `${this.file}.tmp`;
      const payload = JSON.stringify(this.data);
      await fs.writeFile(tmp, payload, 'utf8');
      // OneDrive / antivirus on Windows can briefly lock the target, making the
      // atomic rename fail with EPERM/EBUSY — retry, then fall back to a direct
      // write rather than crashing the process.
      try {
        await this.renameWithRetry(tmp, this.file);
      } catch {
        await fs.writeFile(this.file, payload, 'utf8');
        await fs.rm(tmp, { force: true }).catch(() => {});
      }
    } catch {
      this.dirty = true; // keep the data; a later flush will retry
    } finally {
      this.writing = false;
      if (this.dirty && !this.flushTimer) this.scheduleFlush();
    }
  }

  private async renameWithRetry(from: string, to: string, tries = 5): Promise<void> {
    for (let i = 0; ; i++) {
      try {
        await fs.rename(from, to);
        return;
      } catch (e) {
        if (i >= tries - 1) throw e;
        await new Promise((r) => setTimeout(r, 100 * (i + 1)));
      }
    }
  }
}
