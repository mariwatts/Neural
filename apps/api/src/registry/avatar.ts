import { createHash } from 'node:crypto';
import { priceForLabel } from '../domain/pricing';

/**
 * Deterministic generative AgentCard art (600x600 SVG).
 *
 * Seeded by sha256(name): a mirrored 5x5 glyph (same family as the site's
 * AgentAvatar) over a seeded neural constellation, tinted by category, framed
 * by tier (premium = gold, standard = silver, accessible = category colour).
 * Pure function of the name — works even for names the store has never seen,
 * so an NFT's image URI always renders.
 */

const CATEGORY_COLORS: Record<string, string> = {
  defi: '#1f5be6',
  trading: '#2fa855',
  oracle: '#0ea5b7',
  security: '#e5352b',
  social: '#f0a017',
  infra: '#6361f0',
  research: '#16a34a',
  data: '#2563eb',
  gaming: '#db2777',
  nft: '#9333ea',
  dao: '#ea580c',
  base: '#8a909a',
};

const TIER_FRAME: Record<string, { stroke: string; label: string }> = {
  premium: { stroke: '#f0a017', label: 'PREMIUM' },
  standard: { stroke: '#c2c6cd', label: 'STANDARD' },
  accessible: { stroke: '', label: 'ACCESSIBLE' }, // category colour
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildAvatarSvg(name: string, opts?: { verified?: boolean }): string {
  const fqn = name.toLowerCase();
  const bare = fqn.replace(/\.agent$/, '');
  const parts = bare.split('.');
  const label = parts[0] ?? bare;
  const category = parts[1] && CATEGORY_COLORS[parts[1]] ? parts[1] : 'base';
  const color = CATEGORY_COLORS[category];
  const { tier } = priceForLabel(label);
  const frame = TIER_FRAME[tier] ?? TIER_FRAME.accessible;
  const frameColor = frame.stroke || color;

  const hash = createHash('sha256').update(fqn).digest();
  const rnd = mulberry32(hash.readUInt32LE(0));

  // ── neural constellation ────────────────────────────────────────────────
  const nodes: { x: number; y: number; r: number }[] = [];
  const N = 16 + (hash[4] % 6);
  for (let i = 0; i < N; i++) {
    nodes.push({
      x: 50 + rnd() * 500,
      y: 50 + rnd() * 420,
      r: 1.2 + rnd() * 2.4,
    });
  }
  let edges = '';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 130) {
        const o = ((1 - d / 130) * 0.30).toFixed(3);
        edges += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-opacity="${o}" stroke-width="1"/>`;
      }
    }
  }
  let dots = '';
  for (const n of nodes) {
    dots += `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}" fill="${color}" fill-opacity="0.7"/>`;
  }

  // ── mirrored 5x5 glyph (AgentAvatar family) ─────────────────────────────
  const cells = 5;
  const cell = 56;
  const gx = 300 - (cells * cell) / 2;
  const gy = 250 - (cells * cell) / 2;
  let glyph = '';
  let bi = 0;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < Math.ceil(cells / 2); x++) {
      const on = (hash[bi % hash.length] >> (y % 8)) & 1;
      bi++;
      if (!on) continue;
      const op = (0.55 + ((hash[(bi * 3) % hash.length] % 45) / 100)).toFixed(2);
      glyph += `<rect x="${gx + x * cell}" y="${gy + y * cell}" width="${cell}" height="${cell}" rx="6" fill="${color}" fill-opacity="${op}"/>`;
      const mx = cells - 1 - x;
      if (mx !== x) {
        glyph += `<rect x="${gx + mx * cell}" y="${gy + y * cell}" width="${cell}" height="${cell}" rx="6" fill="${color}" fill-opacity="${op}"/>`;
      }
    }
  }

  // ── name block ──────────────────────────────────────────────────────────
  const fontSize = fqn.length <= 16 ? 34 : fqn.length <= 24 ? 28 : fqn.length <= 32 ? 23 : 18;
  const verifiedMark = opts?.verified
    ? `<g transform="translate(300,468)"><circle r="11" cy="-10" cx="${(esc(fqn).length * fontSize * 0.31 + 24).toFixed(0)}" fill="#2fa855"/><text x="${(esc(fqn).length * fontSize * 0.31 + 24).toFixed(0)}" y="-5" font-size="14" text-anchor="middle" fill="#0b0c0f" font-family="ui-monospace,Menlo,monospace" font-weight="700">✓</text></g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="#0b0c0f"/>
  <rect width="600" height="600" fill="url(#glow)"/>
  ${edges}${dots}
  ${glyph}
  <text x="300" y="468" font-size="${fontSize}" text-anchor="middle" fill="#f3f4f6" font-family="ui-monospace,Menlo,Consolas,monospace" font-weight="700" letter-spacing="0.5">${esc(fqn)}</text>
  ${verifiedMark}
  <text x="300" y="502" font-size="15" text-anchor="middle" fill="#8a909a" font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing="3">NEURONS · ${category.toUpperCase()} · ${frame.label}</text>
  <rect x="14" y="14" width="572" height="572" rx="18" fill="none" stroke="${frameColor}" stroke-width="${tier === 'premium' ? 4 : 2.5}" stroke-opacity="${tier === 'accessible' ? 0.55 : 0.95}"/>
  <rect x="26" y="26" width="548" height="548" rx="12" fill="none" stroke="${frameColor}" stroke-width="1" stroke-opacity="0.25"/>
  <text x="300" y="563" font-size="12" text-anchor="middle" fill="#565c66" font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing="4">.AGENT NAMESPACE · SOLANA</text>
</svg>`;
}
