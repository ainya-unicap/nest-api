import { Module } from '@nestjs/common';

import { ResumoIaController } from './resumo-ia.controller';
import { ResumoIaService } from '../../services/resumoia.service';
import { DossieService } from '../../services/dossie.service';
import { GeradorResumoService } from '../../ai/services/gerador-resumo.service';

@Module({
  controllers: [ResumoIaController],
  providers: [ResumoIaService, DossieService, GeradorResumoService],
  exports: [ResumoIaService],
})
export class ResumoIaModule {}
