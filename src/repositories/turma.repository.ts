import { prisma } from '../prisma';

export class TurmaRepository {
  findById(id: string) {
    return prisma.turma.findUnique({ where: { id } });
  }

  create(data: { name: string; period_id: string; institution_id?: string; created_by: string }) {
    return prisma.turma.create({ data });
  }

  delete(id: string) {
    return prisma.turma.delete({ where: { id } });
  }

  // Turmas criadas pela professora (área dela).
  findByProfessor(userId: string) {
    return prisma.turma.findMany({
      where: { created_by: userId },
      include: { period: { select: { id: true, name: true, semester: true } }, institution: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Turmas em que o aluno está vinculado (tela de perfil).
  findByAluno(userId: string) {
    return prisma.alunoTurma.findMany({
      where: { user_id: userId },
      include: {
        turma: {
          include: {
            period: { select: { id: true, name: true, semester: true } },
            institution: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  temVinculo(userId: string, turmaId: string) {
    return prisma.alunoTurma
      .findUnique({ where: { user_id_turma_id: { user_id: userId, turma_id: turmaId } } })
      .then((v) => !!v);
  }

  vincularAluno(userId: string, turmaId: string) {
    return prisma.alunoTurma.create({ data: { user_id: userId, turma_id: turmaId } });
  }
}
