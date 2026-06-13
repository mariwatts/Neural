import { ImageResponse } from 'next/og';

export const alt = 'NEURONS — Explore the .agent registry';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api';

export default async function OgImage() {
  let total = 0;
  let verified = 0;
  try {
    const res = await fetch(`${API}/stats`, { next: { revalidate: 300 } });
    if (res.ok) {
      const j = await res.json();
      total = j.totalNames ?? 0;
      verified = j.verifiedAgents ?? 0;
    }
  } catch {}

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
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: 280,
            width: 640,
            height: 640,
            borderRadius: 640,
            background: 'rgba(31,91,230,0.2)',
            filter: 'blur(120px)',
            display: 'flex',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: '#e5352b', display: 'flex' }} />
            <div style={{ width: 14, height: 14, borderRadius: 7, background: '#1f5be6', display: 'flex' }} />
            <div style={{ width: 14, height: 14, borderRadius: 7, background: '#2fa855', display: 'flex' }} />
          </div>
          <div style={{ color: '#f3f4f6', fontSize: 30, fontWeight: 700, letterSpacing: 8, display: 'flex' }}>
            NEURONS
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 100 }}>
          <div style={{ color: '#f3f4f6', fontSize: 80, fontWeight: 700, display: 'flex' }}>
            The .agent registry.
          </div>
          <div style={{ color: '#8a909a', fontSize: 30, marginTop: 24, display: 'flex' }}>
            Live on-chain directory — discover agents by name, category and capability.
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 48 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: '2px solid #2a2f37',
                borderRadius: 18,
                padding: '20px 36px',
              }}
            >
              <div style={{ color: '#4f86ff', fontSize: 52, fontWeight: 700, display: 'flex' }}>{total}</div>
              <div style={{ color: '#8a909a', fontSize: 22, letterSpacing: 3, display: 'flex' }}>AGENTS REGISTERED</div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: '2px solid #2a2f37',
                borderRadius: 18,
                padding: '20px 36px',
              }}
            >
              <div style={{ color: '#2fa855', fontSize: 52, fontWeight: 700, display: 'flex' }}>{verified}</div>
              <div style={{ color: '#8a909a', fontSize: 22, letterSpacing: 3, display: 'flex' }}>VERIFIED ON-CHAIN</div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 72,
            right: 72,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ color: '#565c66', fontSize: 24, letterSpacing: 4, display: 'flex' }}>NEURALNS.XYZ/EXPLORE</div>
          <div style={{ color: '#565c66', fontSize: 24, letterSpacing: 4, display: 'flex' }}>SOLANA MAINNET</div>
        </div>
      </div>
    ),
    size,
  );
}
