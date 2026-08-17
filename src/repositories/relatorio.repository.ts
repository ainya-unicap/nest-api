import { prisma } from '../prisma';

export class RelatorioRepository {
  getRelatoriosByUser(userId: string) {
    return prisma.relatorio.findMany({ where: { user_id: userId }, include: { list: { include: { plant: { select: { name: true } } } }, canteiro: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }

  createRelatorio(data: any) {
    return prisma.relatorio.create({ data });
  }

  findById(id: string) {
    return prisma.relatorio.findUnique({ where: { id }, include: { list: { include: { plant: true } }, canteiro: true } });
  }

  update(id: string, data: any) {
    return prisma.relatorio.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.relatorio.delete({ where: { id } });
  }
}
