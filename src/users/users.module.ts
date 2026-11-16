import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PromoteUserUseCase } from '../shared/application/use-cases/promote-user.use-case';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [UsersController],
  providers: [PromoteUserUseCase],
  exports: [],
})
export class UsersModule {}
