import { Module } from '@nestjs/common';
import { AcademicPeriodsController } from './academic-periods.controller';
import { AcademicPeriodService } from '../../services/academicperiod.service';

@Module({
  controllers: [AcademicPeriodsController],
  providers: [AcademicPeriodService],
  exports: [AcademicPeriodService],
})
export class AcademicPeriodsModule {}
