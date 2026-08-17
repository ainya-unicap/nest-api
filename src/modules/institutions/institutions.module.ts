import { Module } from '@nestjs/common';
import { InstitutionsController } from './institutions.controller';
import { InstitutionService } from '../../services/institution.service';

@Module({
  controllers: [InstitutionsController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionsModule {}
