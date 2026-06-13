import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';

import AppKitProvider from '@/context';
import { SpiderCursor } from '@/components/ui/spider-cursor';
import SmoothScroll from '@/components/SmoothScroll';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import CommandPalette from '@/components/CommandPalette';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NEURONS · NeuralNS — Namespace Protocol for AI Agents on Solana',
  description:
    'NeuralNS assigns persistent, human-readable identities to AI agents on Solana. Claim name.agent handles, mint an AgentCard, and get discovered by capability.',
  icons: { icon: '/logo.png' },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://neuralns.xyz'),
  twitter: { card: 'summary_large_image', site: '@NeuralNS' },
};

export const viewport: Viewport = {
  themeColor: '#eceae3',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${sans.variable}`}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('neurons-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();",
          }}
        />
        <AppKitProvider>
          <SpiderCursor />
          <SmoothScroll />
          <CommandPalette />
          <Nav />
          <main style={{ position: 'relative', zIndex: 1, paddingTop: 68, minHeight: '70vh' }}>
            {children}
          </main>
          <Footer />
        </AppKitProvider>
      </body>
    </html>
  );
}
