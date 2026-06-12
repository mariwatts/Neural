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
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <a
                href="https://x.com/NeuralNS"
                target="_blank"
                rel="noopener noreferrer"
                data-hot
                aria-label="NEURONS on X"
                className="footer-social"
                title="X / Twitter"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
                </svg>
              </a>
              <a
                href="https://github.com/hotbrilliant/Neurons"
                target="_blank"
                rel="noopener noreferrer"
                data-hot
                aria-label="NEURONS on GitHub"
                className="footer-social"
                title="GitHub"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385 0.6 0.113 0.82-0.258 0.82-0.577 0-0.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.546-1.387-1.333-1.756-1.333-1.756-1.089-0.745 0.084-0.729 0.084-0.729 1.205 0.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495 0.998 0.108-0.776 0.417-1.305 0.76-1.605-2.665-0.3-5.466-1.332-5.466-5.93 0-1.31 0.465-2.38 1.235-3.22-0.135-0.303-0.54-1.523 0.105-3.176 0 0 1.005-0.322 3.3 1.23 0.96-0.267 1.98-0.399 3-0.405 1.02 0.006 2.04 0.138 3 0.405 2.28-1.552 3.285-1.23 3.285-1.23 0.645 1.653 0.24 2.873 0.12 3.176 0.765 0.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92 0.42 0.36 0.81 1.096 0.81 2.22 0 1.606-0.015 2.896-0.015 3.286 0 0.315 0.21 0.69 0.825 0.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>
            <style>{`
              .footer-social {
                display: grid;
                place-items: center;
                width: 36px;
                height: 36px;
                border-radius: 9px;
                border: 1px solid var(--line);
                background: var(--bg-1);
                color: var(--ink-1);
                transition: color 0.18s, border-color 0.18s;
              }
              .footer-social:hover { color: var(--ink-0); border-color: var(--line-bright); }
            `}</style>
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
