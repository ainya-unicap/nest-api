import { Module } from '@nestjs/common';
import { RelatoriosController } from './relatorios.controller';
import { RelatorioService } from '../../services/relatorio.service';

@Module({
  controllers: [RelatoriosController],
  providers: [RelatorioService],
  exports: [RelatorioService],
})
export class RelatoriosModule {}
