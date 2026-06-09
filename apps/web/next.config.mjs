import { join } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo: pin the file-tracing root to silence multi-lockfile inference.
  outputFileTracingRoot: join(import.meta.dirname, '..', '..'),
  // Reown AppKit / WalletConnect pull in optional node-only deps; exclude them
  // from the browser bundle (official Reown Next.js guidance).
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
