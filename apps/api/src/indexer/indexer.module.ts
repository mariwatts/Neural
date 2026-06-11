import { Module } from '@nestjs/common';
import { OnchainIndexerService } from './onchain-indexer.service';
import { IndexerController } from './indexer.controller';

@Module({
  providers: [OnchainIndexerService],
  controllers: [IndexerController],
  exports: [OnchainIndexerService],
})
export class IndexerModule {}
