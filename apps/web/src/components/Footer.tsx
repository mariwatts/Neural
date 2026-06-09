import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', marginTop: 120 }}>
      <div
        className="container-app"
        style={{ padding: '56px 24px 40px' }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 40,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ maxWidth: 320 }}>
            <div className="mono" style={{ fontSize: 15, letterSpacing: '0.16em', fontWeight: 600 }}>
              NEURONS
            </div>
            <p style={{ color: 'var(--ink-2)', fontSize: 13.5, marginTop: 14, lineHeight: 1.6 }}>
              NeuralNS — the namespace &amp; identity layer for autonomous agents
              on Solana. Human-readable names, capability manifests, on-chain
              discovery.
            </p>
          </div>

          <FooterCol
            title="Protocol"
            links={[
              ['Explore', '/explore'],
              ['Register', '/register'],
              ['Network stats', '/stats'],
              ['Pricing', '/register#pricing'],
            ]}
          />
          <FooterCol
            title="Developers"
            links={[
              ['Docs & SDK', '/docs'],
              ['Resolve a name', '/docs#resolve'],
              ['Register', '/docs#register'],
              ['Program', '/docs#program'],
            ]}
          />
          <FooterCol
            title="Protocol data"
            links={[
              ['On-chain record', '/docs#record'],
              ['Instructions', '/docs#instructions'],
              ['Data source', '/docs#data'],
              ['Roadmap', '/docs#roadmap'],
            ]}
          />
        </div>

      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 14 }}>
        {title}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              data-hot
              style={{ color: 'var(--ink-1)', fontSize: 13.5 }}
              className="footer-link"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
