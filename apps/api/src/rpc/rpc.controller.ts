import { Body, Controller, Post } from '@nestjs/common';

/**
 * Thin Solana JSON-RPC proxy. The browser talks to /api/rpc (same origin),
 * we forward to a reliable RPC (Helius) server-side so the API key never ships
 * to the client and transactions actually land / confirm.
 */
const UPSTREAM = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

@Controller('rpc')
export class RpcController {
  @Post()
  async proxy(@Body() body: unknown): Promise<unknown> {
    const res = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }
}
