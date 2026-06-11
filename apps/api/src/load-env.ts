// Dependency-free .env loader — must be the FIRST import in main.ts so that
// modules reading process.env at import time (rpc proxy, indexer) see the values.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

try {
  const raw = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
} catch {
  // no .env — fine, fall back to process env / defaults
}
