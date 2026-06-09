import { categoryMeta } from '@/lib/categories';

/**
 * Deterministic generative AgentCard glyph. Seeded by the AgentCard avatarSeed
 * (sha256 prefix) and tinted by category — every agent gets a unique, stable
 * mark with zero network cost.
 */
export default function AgentAvatar({
  seed,
  category,
  size = 48,
  rounded = 12,
}: {
  seed: string;
  category: string;
  size?: number;
  rounded?: number;
}) {
  const color = categoryMeta(category).color;
  const bytes: number[] = [];
  for (let i = 0; i < seed.length; i += 2) {
    bytes.push(parseInt(seed.slice(i, i + 2) || '0', 16) || 0);
  }
  while (bytes.length < 16) bytes.push((bytes[bytes.length - 1] ?? 7) * 31 % 256);

  const cells = 5;
  const cell = 100 / cells;
  const rects: React.ReactNode[] = [];
  let bi = 0;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < Math.ceil(cells / 2); x++) {
      const on = (bytes[bi % bytes.length] >> (y % 8)) & 1;
      bi++;
      if (on) {
        const op = 0.45 + ((bytes[(bi * 3) % bytes.length] % 55) / 100);
        rects.push(
          <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={color} opacity={op} />,
        );
        if (x !== cells - 1 - x) {
          rects.push(
            <rect key={`m-${x}-${y}`} x={(cells - 1 - x) * cell} y={y * cell} width={cell} height={cell} fill={color} opacity={op} />,
          );
        }
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        borderRadius: rounded,
        background: 'radial-gradient(120% 120% at 30% 20%, var(--bg-2), var(--bg-3))',
        border: '1px solid var(--line)',
        flexShrink: 0,
      }}
      aria-hidden
    >
      {rects}
    </svg>
  );
}
