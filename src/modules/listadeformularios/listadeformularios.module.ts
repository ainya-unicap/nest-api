import { Module } from '@nestjs/common';
import { ListaDeFormulariosController } from './listadeformularios.controller';
import { ListaDeFormulariosService } from '../../services/listadeformularios.service';
import { DossieService } from '../../services/dossie.service';

@Module({
  controllers: [ListaDeFormulariosController],
  providers: [ListaDeFormulariosService, DossieService],
  exports: [ListaDeFormulariosService, DossieService],
})
export class ListaDeFormulariosModule {}
