import { Module } from '@nestjs/common';
import { CanteirosController } from './canteiros.controller';
import { CanteiroService } from '../../services/canteiro.service';
import { ElizaService } from '../../services/eliza.service';

@Module({
  controllers: [CanteirosController],
  providers: [CanteiroService, ElizaService],
  exports: [CanteiroService],
})
export class CanteirosModule {}
