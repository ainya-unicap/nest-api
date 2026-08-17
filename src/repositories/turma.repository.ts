import { prisma } from '../prisma';

export class TurmaRepository {
  findAll() {
    return prisma.turma.findMany();
  }

  findById(id: string) {
    return prisma.turma.findUnique({ where: { id } });
  }

  create(data: any) {
    return prisma.turma.create({ data });
  }

  update(id: string, data: any) {
    return prisma.turma.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.turma.delete({ where: { id } });
  }
}
