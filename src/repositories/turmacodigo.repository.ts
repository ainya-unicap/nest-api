import { prisma } from '../prisma';

export class TurmaCodigoRepository {
  create(data: { turma_id: string; code: string }) {
    return prisma.turmaCodigo.create({ data });
  }

  findByCode(code: string) {
    return prisma.turmaCodigo.findUnique({ where: { code } });
  }

  findByTurma(turmaId: string) {
    return prisma.turmaCodigo.findMany({ where: { turma_id: turmaId }, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return prisma.turmaCodigo.findUnique({ where: { id } });
  }

  delete(id: string) {
    return prisma.turmaCodigo.delete({ where: { id } });
  }
}
