import { Module } from '@nestjs/common';
import { UserCanteirosController } from './user-canteiros.controller';
import { UserCanteiroService } from '../../services/usercanteiro.service';

@Module({
  controllers: [UserCanteirosController],
  providers: [UserCanteiroService],
  exports: [UserCanteiroService],
})
export class UserCanteirosModule {}
