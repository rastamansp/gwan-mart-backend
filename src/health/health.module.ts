import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  // SharedModule fornece o IStorageService; a DataSource e o CACHE_MANAGER
  // vêm dos módulos globais (TypeOrmModule.forRootAsync e RedisCacheModule).
  imports: [SharedModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
