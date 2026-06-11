import { Controller, Post } from '@nestjs/common';
import { OnchainIndexerService } from './onchain-indexer.service';

@Controller('index')
export class IndexerController {
  constructor(private readonly indexer: OnchainIndexerService) {}

  /** Force an immediate re-index (called by the app right after a registration). */
  @Post('refresh')
  async refresh(): Promise<{ count: number }> {
    const count = await this.indexer.refresh();
    return { count };
  }
}
