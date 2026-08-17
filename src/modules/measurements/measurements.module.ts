import { Module } from '@nestjs/common';
import { MeasurementsController } from './measurements.controller';
import { MeasurementService } from '../../services/measurement.service';

@Module({
  controllers: [MeasurementsController],
  providers: [MeasurementService],
  exports: [MeasurementService],
})
export class MeasurementsModule {}
