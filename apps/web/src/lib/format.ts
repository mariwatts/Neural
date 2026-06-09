export function short(pk: string, head = 4, tail = 4): string {
  if (!pk) return '';
  if (pk.length <= head + tail + 1) return pk;
  return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return 'now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export function num(n: number, opts: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-US', opts).format(n);
}

export function compact(n: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

export function sol(n: number, dp = 2): string {
  return `${num(n, { maximumFractionDigits: dp })} SOL`;
}

export function rep(score: number): string {
  return (score / 100).toFixed(1);
}

/** Human label for an activity type. */
export const ACTIVITY_LABEL: Record<string, string> = {
  register: 'registered',
  mint_card: 'minted AgentCard',
  verify: 'verified',
  renew: 'renewed',
  transfer: 'transferred',
  link_wallet: 'linked wallet',
  update_metadata: 'updated manifest',
  update_resolver: 'updated resolver',
  category_create: 'created namespace',
  resolve: 'resolved',
  task: 'served task',
};

export const ACTIVITY_GLYPH: Record<string, string> = {
  register: '◇',
  mint_card: '◈',
  verify: '✓',
  renew: '↻',
  transfer: '⇄',
  link_wallet: '⚭',
  update_metadata: '✎',
  update_resolver: '⊹',
  category_create: '⊞',
  resolve: '→',
  task: '∴',
};
