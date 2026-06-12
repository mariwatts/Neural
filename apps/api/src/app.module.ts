import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StoreModule } from './store/store.module';
import { RegistryModule } from './registry/registry.module';
import { RpcModule } from './rpc/rpc.module';
import { IndexerModule } from './indexer/indexer.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    StoreModule,
    RegistryModule,
    RpcModule,
    IndexerModule,
  ],
})
export class AppModule {}
