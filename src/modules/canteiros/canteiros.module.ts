import { Module } from '@nestjs/common';
import { CanteirosController } from './canteiros.controller';
import { CanteiroService } from '../../services/canteiro.service';

@Module({
  controllers: [CanteirosController],
  providers: [CanteiroService],
  exports: [CanteiroService],
})
export class CanteirosModule {}
