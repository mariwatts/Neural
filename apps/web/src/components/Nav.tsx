'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import ConnectButton from './ConnectButton';
import ThemeToggle from './ThemeToggle';

const LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/register', label: 'Register' },
  { href: '/buy', label: 'Buy' },
  { href: '/stats', label: 'Stats' },
  { href: '/docs', label: 'Docs' },
];

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
        background: scrolled ? 'var(--nav-bg)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px) saturate(1.1)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--line)' : 'transparent'}`,
      }}
    >
      <nav
        className="container-app"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          height: 68,
        }}
      >
        {/* wordmark */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }} data-hot>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NeuralNS" width={28} height={28} style={{ display: 'block' }} />
          <span
            className="mono"
            style={{ fontSize: 15, letterSpacing: '0.16em', fontWeight: 700 }}
          >
            NEURONS
          </span>
        </Link>

        {/* center links */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginLeft: 24,
          }}
          className="nav-links"
        >
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                data-hot
                className="mono"
                style={{
                  fontSize: 12.5,
                  letterSpacing: '0.04em',
                  padding: '8px 12px',
                  borderRadius: 7,
                  color: active ? '#fff' : 'var(--ink-1)',
                  background: active ? 'var(--accent)' : 'transparent',
                  transition: 'color 0.18s, background 0.18s',
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* socials */}
          <a
            href="https://x.com/NeuralNS"
            target="_blank"
            rel="noopener noreferrer"
            data-hot
            aria-label="NEURONS on X"
            className="nav-social"
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
            className="nav-social"
            title="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385 0.6 0.113 0.82-0.258 0.82-0.577 0-0.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.546-1.387-1.333-1.756-1.333-1.756-1.089-0.745 0.084-0.729 0.084-0.729 1.205 0.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495 0.998 0.108-0.776 0.417-1.305 0.76-1.605-2.665-0.3-5.466-1.332-5.466-5.93 0-1.31 0.465-2.38 1.235-3.22-0.135-0.303-0.54-1.523 0.105-3.176 0 0 1.005-0.322 3.3 1.23 0.96-0.267 1.98-0.399 3-0.405 1.02 0.006 2.04 0.138 3 0.405 2.28-1.552 3.285-1.23 3.285-1.23 0.645 1.653 0.24 2.873 0.12 3.176 0.765 0.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92 0.42 0.36 0.81 1.096 0.81 2.22 0 1.606-0.015 2.896-0.015 3.286 0 0.315 0.21 0.69 0.825 0.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>

          {/* network badge */}
          <div
            className="chip"
            style={{ height: 38 }}
            title="Solana Mainnet"
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'linear-gradient(120deg, var(--color-sol-a), var(--color-sol-b))',
              }}
            />
            <span className="solana-label">Solana</span>
          </div>

          <ThemeToggle />
          <ConnectButton variant="nav" />
        </div>
      </nav>

      <style>{`
        .nav-social {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 9px;
          border: 1px solid var(--line);
          background: var(--bg-1);
          color: var(--ink-1);
          transition: color 0.18s, border-color 0.18s;
        }
        .nav-social:hover { color: var(--ink-0); border-color: var(--line-bright); }
        @media (max-width: 860px) {
          .nav-links { display: none !important; }
          .solana-label { display: none; }
          .nav-social { display: none !important; }
        }
      `}</style>
    </header>
  );
}
