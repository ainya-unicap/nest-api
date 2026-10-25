import { Module } from '@nestjs/common';
import { FormulariosController } from './formularios.controller';
import { FormularioService } from '../../services/formulario.service';

@Module({
  controllers: [FormulariosController],
  providers: [FormularioService],
  exports: [FormularioService],
})
export class FormulariosModule {}
