// PM2 process definitions for the NEURONS deployment.
// Isolated from other apps on the box: unique names, unique localhost ports,
// bound to 127.0.0.1 (only nginx reaches them).
module.exports = {
  apps: [
    {
      name: 'neuralns-api',
      cwd: '/var/www/neuralns/apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '4137',
        WEB_ORIGIN: 'https://neuralns.xyz',
      },
    },
    {
      // USD price peg: re-prices the on-chain config when SOL/token rates drift
      name: 'neuralns-peg',
      cwd: '/var/www/neuralns',
      script: 'scripts/peg-prices.mjs',
      args: '--watch 15',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
        // set SOLANA_RPC in the server environment (e.g. a Helius endpoint)
        SOLANA_RPC: process.env.SOLANA_RPC || '',
      },
    },
    {
      name: 'neuralns-web',
      cwd: '/var/www/neuralns/apps/web',
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: '3137',
        HOSTNAME: '127.0.0.1',
        API_INTERNAL_URL: 'http://127.0.0.1:4137/api',
        NEXT_PUBLIC_API_URL: 'https://neuralns.xyz/api',
      },
    },
  ],
};
