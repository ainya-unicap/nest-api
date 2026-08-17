import { Module } from '@nestjs/common';
import { TurmasController } from './turmas.controller';
import { TurmaService } from '../../services/turma.service';

@Module({
  controllers: [TurmasController],
  providers: [TurmaService],
  exports: [TurmaService],
})
export class TurmasModule {}
