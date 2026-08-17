import { prisma } from '../prisma';

export class AlunoTurmaRepository {
  create(data: any) {
    return prisma.alunoTurma.create({ data });
  }

  findByTurma(turmaId: string) {
    return prisma.alunoTurma.findMany({ where: { turma_id: turmaId } });
  }

  delete(data: any) {
    return prisma.alunoTurma.delete({ where: { user_id_turma_id: { user_id: data.aluno_id, turma_id: data.turma_id } } });
  }
}
