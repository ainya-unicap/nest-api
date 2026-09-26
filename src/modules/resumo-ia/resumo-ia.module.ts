import { Module } from '@nestjs/common';

import { ResumoIaController } from './resumo-ia.controller';
import { ResumoIaService } from '../../services/resumoia.service';
import { DossieService } from '../../services/dossie.service';

@Module({
  controllers: [ResumoIaController],
  providers: [ResumoIaService, DossieService],
  exports: [ResumoIaService],
})
export class ResumoIaModule {}
