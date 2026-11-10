import { Module } from '@nestjs/common';

import { ProfessoresController } from './professores.controller';
import { ProfessorService } from '../../services/professor.service';

@Module({
  controllers: [ProfessoresController],
  providers: [ProfessorService],
})
export class ProfessoresModule {}
