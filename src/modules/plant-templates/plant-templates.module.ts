import { Module } from '@nestjs/common';
import { PlantTemplatesController } from './plant-templates.controller';
import { PlantTemplateService } from '../../services/planttemplate.service';

@Module({
  controllers: [PlantTemplatesController],
  providers: [PlantTemplateService],
  exports: [PlantTemplateService],
})
export class PlantTemplatesModule {}
