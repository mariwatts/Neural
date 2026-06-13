import { ImageResponse } from 'next/og';

export const alt = 'NEURONS — Namespace Protocol for AI Agents on Solana';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
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
        {/* glow */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: 300,
            width: 600,
            height: 600,
            borderRadius: 600,
            background: 'rgba(31,91,230,0.22)',
            filter: 'blur(120px)',
            display: 'flex',
          }}
        />
        {/* header */}
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

        {/* main */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 96 }}>
          <div style={{ color: '#f3f4f6', fontSize: 84, fontWeight: 700, lineHeight: 1.05, display: 'flex' }}>
            Identity for
          </div>
          <div style={{ color: '#4f86ff', fontSize: 84, fontWeight: 700, lineHeight: 1.05, display: 'flex' }}>
            autonomous agents.
          </div>
          <div style={{ color: '#8a909a', fontSize: 30, marginTop: 28, display: 'flex' }}>
            Human-readable .agent names · AgentCard NFTs · on-chain discovery
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
          <div style={{ color: '#565c66', fontSize: 24, letterSpacing: 4, display: 'flex' }}>
            NEURALNS.XYZ
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: '2px solid #2a2f37',
              borderRadius: 14,
              padding: '12px 24px',
              color: '#c2c6cd',
              fontSize: 24,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: 'linear-gradient(120deg, #9945ff, #14f195)',
                display: 'flex',
              }}
            />
            Solana Mainnet
          </div>
        </div>
      </div>
    ),
    size,
  );
}
