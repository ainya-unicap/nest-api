import { Module } from '@nestjs/common';
import { ListaDeFormulariosController } from './listadeformularios.controller';
import { ListaDeFormulariosService } from '../../services/listadeformularios.service';

@Module({
  controllers: [ListaDeFormulariosController],
  providers: [ListaDeFormulariosService],
  exports: [ListaDeFormulariosService],
})
export class ListaDeFormulariosModule {}
