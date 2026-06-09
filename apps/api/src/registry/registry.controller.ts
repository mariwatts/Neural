import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  RegistryService,
  type ExploreQuery,
  type RegisterDto,
} from './registry.service';

/**
 * REST surface mirroring the protocol API (cd.md §7.3) plus the explorer /
 * stats endpoints the web app needs.
 */
@Controller()
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  // ── Resolver API (spec §7.3) ──────────────────────────────────────────

  @Get('resolve/:name')
  resolve(@Param('name') name: string) {
    return this.registry.resolve(name);
  }

  @Get('reverse/:wallet')
  reverse(@Param('wallet') wallet: string) {
    return this.registry.reverse(wallet);
  }

  @Get('agent/:name/capabilities')
  capabilities(@Param('name') name: string) {
    return this.registry.capabilities(name);
  }

  /** Metaplex-standard NFT JSON for the AgentCard (what wallets fetch). */
  @Get('agent/:name/card.json')
  cardJson(@Param('name') name: string) {
    return this.registry.cardJson(name);
  }

  @Get('agent/:name')
  agent(@Param('name') name: string) {
    return this.registry.resolveFull(name);
  }

  @Get('names/:wallet')
  namesByWallet(@Param('wallet') wallet: string) {
    return this.registry.namesByWallet(wallet);
  }

  @Get('discover')
  discover(
    @Query('capability') capability?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.registry.discover({
      capability,
      category,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ── Explorer / web-app endpoints ──────────────────────────────────────

  @Get('explore')
  explore(@Query() query: ExploreQuery) {
    return this.registry.explore(query);
  }

  @Get('availability')
  availability(
    @Query('name') name: string,
    @Query('category') category?: string,
  ) {
    return this.registry.availability(name ?? '', category);
  }

  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    return this.registry.leaderboard(limit ? Number(limit) : undefined);
  }

  @Get('activity')
  activity(@Query('limit') limit?: string, @Query('type') type?: string) {
    return this.registry.getActivity(limit ? Number(limit) : undefined, type);
  }

  @Get('categories')
  categories() {
    return this.registry.categories();
  }

  @Get('stats')
  stats() {
    return this.registry.stats();
  }

  @Get('stats/timeline')
  timeline(@Query('days') days?: string) {
    return this.registry.registrationsTimeline(days ? Number(days) : undefined);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registry.register(dto);
  }

  @Get('health')
  health() {
    return { ok: true, ts: Date.now() };
  }
}
