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
        @media (max-width: 860px) {
          .nav-links { display: none !important; }
          .solana-label { display: none; }
        }
      `}</style>
    </header>
  );
}
