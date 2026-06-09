import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="container-app"
      style={{
        minHeight: '64vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div className="mono" style={{ fontSize: 13, color: 'var(--amber)' }}>
        ✗ NXDOMAIN
      </div>
      <h1 style={{ fontSize: 'clamp(40px, 8vw, 88px)', marginTop: 16 }}>
        Name not<span className="text-mint-gradient"> resolved.</span>
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 14, maxWidth: 460 }}>
        This <span className="mono" style={{ color: 'var(--ink-1)' }}>.agent</span> name
        isn&apos;t registered yet — which means it might be available.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/register" className="btn btn-primary" data-hot>
          Register it
        </Link>
        <Link href="/explore" className="btn btn-ghost" data-hot>
          Explore the registry
        </Link>
      </div>
    </div>
  );
}
