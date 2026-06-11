import PayWithSol from '@/components/PayWithSol';

export const metadata = {
  title: 'Pay with SOL — NEURONS NeuralNS',
};

export default function BuyPage() {
  return (
    <div className="container-app" style={{ paddingTop: 'clamp(40px, 7vh, 72px)', paddingBottom: 80 }}>
      <div style={{ textAlign: 'center', marginBottom: 34 }}>
        <span className="eyebrow">Checkout</span>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginTop: 10 }}>Pay with SOL.</h1>
        <p style={{ color: 'var(--ink-2)', maxWidth: 560, margin: '14px auto 0', fontSize: 'clamp(14px,1.6vw,16px)', lineHeight: 1.6 }}>
          Send SOL straight from your wallet on Solana mainnet. Pick an amount,
          confirm in your wallet, get an on-chain receipt. No registration needed.
        </p>
      </div>

      <PayWithSol />

      <div className="mono" style={{ textAlign: 'center', marginTop: 26, fontSize: 11, color: 'var(--ink-3)' }}>
        Powered by Reown AppKit · Solana mainnet · Phantom · Solflare · Backpack &amp; more
      </div>
    </div>
  );
}
