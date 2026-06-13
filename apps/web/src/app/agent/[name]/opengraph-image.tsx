import { ImageResponse } from 'next/og';

export const alt = 'NEURONS AgentCard';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api';

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

const TIER_COLORS: Record<string, string> = {
  premium: '#f0a017',
  standard: '#c2c6cd',
  accessible: '#8a909a',
};

interface AgentInfo {
  name: string;
  verified: boolean;
  category: string;
  tier: string;
  pda: string;
  capabilities: string[];
}

async function loadAgent(raw: string): Promise<AgentInfo> {
  const name = decodeURIComponent(raw).toLowerCase();
  const fqn = name.endsWith('.agent') ? name : `${name}.agent`;
  const bare = fqn.replace(/\.agent$/, '');
  const parts = bare.split('.');
  const fallback: AgentInfo = {
    name: fqn,
    verified: false,
    category: parts[1] && CATEGORY_COLORS[parts[1]] ? parts[1] : 'base',
    tier: parts[0].length <= 4 ? 'premium' : parts[0].length <= 9 ? 'standard' : 'accessible',
    pda: '',
    capabilities: [],
  };
  try {
    const res = await fetch(`${API}/agent/${fqn}`, { next: { revalidate: 120 } });
    if (!res.ok) return fallback;
    const j = await res.json();
    return {
      name: j.name ?? fqn,
      verified: !!j.verified,
      category: j.category ?? fallback.category,
      tier: j.tier ?? fallback.tier,
      pda: j.pda ?? '',
      capabilities: j.card?.capabilities ?? [],
    };
  } catch {
    return fallback;
  }
}

export default async function OgImage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const agent = await loadAgent(name);
  const color = CATEGORY_COLORS[agent.category] ?? CATEGORY_COLORS.base;
  const tierColor = TIER_COLORS[agent.tier] ?? TIER_COLORS.accessible;
  const fontSize =
    agent.name.length <= 14 ? 92 : agent.name.length <= 22 ? 72 : agent.name.length <= 30 ? 56 : 44;
  const pdaShort = agent.pda ? `${agent.pda.slice(0, 8)}…${agent.pda.slice(-8)}` : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0b0c0f',
          padding: 72,
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* category glow */}
        <div
          style={{
            position: 'absolute',
            top: -220,
            left: 320,
            width: 640,
            height: 640,
            borderRadius: 640,
            background: color,
            opacity: 0.18,
            filter: 'blur(130px)',
            display: 'flex',
          }}
        />
        {/* tier frame */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: `3px solid ${tierColor}`,
            opacity: agent.tier === 'premium' ? 0.9 : 0.4,
            borderRadius: 24,
            display: 'flex',
          }}
        />

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: '#e5352b', display: 'flex' }} />
              <div style={{ width: 12, height: 12, borderRadius: 6, background: '#1f5be6', display: 'flex' }} />
              <div style={{ width: 12, height: 12, borderRadius: 6, background: '#2fa855', display: 'flex' }} />
            </div>
            <div style={{ color: '#c2c6cd', fontSize: 26, fontWeight: 700, letterSpacing: 7, display: 'flex' }}>
              NEURONS · AGENTCARD
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              color: tierColor,
              border: `2px solid ${tierColor}`,
              borderRadius: 12,
              padding: '8px 20px',
              fontSize: 24,
              letterSpacing: 4,
              fontWeight: 700,
            }}
          >
            {agent.tier.toUpperCase()}
          </div>
        </div>

        {/* name */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 110 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div
              style={{
                color: '#f3f4f6',
                fontSize,
                fontWeight: 700,
                lineHeight: 1,
                display: 'flex',
              }}
            >
              {agent.name}
            </div>
            {agent.verified && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  background: '#2fa855',
                  color: '#0b0c0f',
                  fontSize: 32,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
            <div
              style={{
                display: 'flex',
                color,
                border: `2px solid ${color}`,
                borderRadius: 12,
                padding: '8px 20px',
                fontSize: 26,
                letterSpacing: 2,
              }}
            >
              {agent.category}.agent
            </div>
            {agent.capabilities.slice(0, 3).map((c) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  color: '#8a909a',
                  border: '2px solid #2a2f37',
                  borderRadius: 12,
                  padding: '8px 20px',
                  fontSize: 26,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 72,
            right: 72,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ color: '#565c66', fontSize: 23, letterSpacing: 3, display: 'flex' }}>
            {pdaShort ? `PDA ${pdaShort}` : '.AGENT NAMESPACE'}
          </div>
          <div style={{ color: '#565c66', fontSize: 23, letterSpacing: 3, display: 'flex' }}>
            NEURALNS.XYZ · SOLANA
          </div>
        </div>
      </div>
    ),
    size,
  );
}
