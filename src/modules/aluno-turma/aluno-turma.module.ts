import { Module } from '@nestjs/common';
import { AlunoTurmaController } from './aluno-turma.controller';
import { AlunoTurmaService } from '../../services/alunoturma.service';

@Module({
  controllers: [AlunoTurmaController],
  providers: [AlunoTurmaService],
  exports: [AlunoTurmaService],
})
export class AlunoTurmaModule {}
