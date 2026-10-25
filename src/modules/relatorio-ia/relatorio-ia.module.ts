import { Module } from '@nestjs/common';
import { RelatorioIaController } from './relatorio-ia.controller';
import { RelatorioIaService } from '../../services/relatorioia.service';
import { CanteiroService } from '../../services/canteiro.service';
import { ElizaService } from '../../services/eliza.service';
import { RelatorioService } from '../../services/relatorio.service';

@Module({
  controllers: [RelatorioIaController],
  providers: [RelatorioIaService, CanteiroService, ElizaService, RelatorioService],
})
export class RelatorioIaModule {}
