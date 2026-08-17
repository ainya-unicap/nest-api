import { Module } from '@nestjs/common';
import { AlunosController } from './alunos.controller';
import { AlunoService } from '../../services/aluno.service';

@Module({
  controllers: [AlunosController],
  providers: [AlunoService],
  exports: [AlunoService],
})
export class AlunosModule {}
