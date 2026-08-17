import { Module } from '@nestjs/common';
import { FormulariosController } from './formularios.controller';
import { FormularioService } from '../../services/formulario.service';
import { ChecklistService } from '../../services/checklist.service';
import { MeasurementService } from '../../services/measurement.service';

@Module({
  controllers: [FormulariosController],
  providers: [FormularioService, ChecklistService, MeasurementService],
  exports: [FormularioService, ChecklistService, MeasurementService],
})
export class FormulariosModule {}
