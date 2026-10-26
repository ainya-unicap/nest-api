import { Module } from '@nestjs/common';
import { PlantasForrageirasController } from './plantas-forrageiras.controller';
import { PlantaForrageiraService } from '../../services/plantaforrageira.service';

@Module({
  controllers: [PlantasForrageirasController],
  providers: [PlantaForrageiraService],
  exports: [PlantaForrageiraService],
})
export class PlantasForrageirasModule {}
