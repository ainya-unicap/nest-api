import { prisma } from '../prisma';

export class EntregaRelatorioRepository {
  findByUserETurma(userId: string, turmaId: string) {
    return prisma.entregaRelatorio.findUnique({
      where: { user_id_turma_id: { user_id: userId, turma_id: turmaId } },
    });
  }

  findByTurma(turmaId: string) {
    return prisma.entregaRelatorio.findMany({
      where: { turma_id: turmaId },
      include: { user: { select: { id: true, name: true, email: true, matricula: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  upsert(userId: string, turmaId: string, data: { fileUrl: string; fileName: string }) {
    return prisma.entregaRelatorio.upsert({
      where: { user_id_turma_id: { user_id: userId, turma_id: turmaId } },
      create: { user_id: userId, turma_id: turmaId, ...data },
      update: { ...data, submittedAt: new Date() },
    });
  }

  delete(userId: string, turmaId: string) {
    return prisma.entregaRelatorio.delete({
      where: { user_id_turma_id: { user_id: userId, turma_id: turmaId } },
    });
  }

  findByTurmaParaApagar(turmaId: string) {
    return prisma.entregaRelatorio.findMany({ where: { turma_id: turmaId }, select: { fileUrl: true } });
  }
}
