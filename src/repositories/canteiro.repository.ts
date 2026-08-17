import { prisma } from '../prisma';

export class CanteiroRepository {
  findByUser(userId: string) {
    return prisma.userCanteiro.findMany({ where: { user_id: userId }, include: { canteiro: { include: { plant: { select: { id: true, name: true, category: true } }, listaDeFormularios: { include: { plant: { select: { id: true, name: true } }, _count: { select: { formularios: true } } } } } } } });
  }

  create(data: any) {
    return prisma.canteiro.create({ data });
  }

  findListasByCanteiro(canteiroId: string) {
    return prisma.listaDeFormularios.findMany({ where: { canteiro_id: canteiroId }, include: { plant: { select: { id: true, name: true, category: true } }, _count: { select: { formularios: true } } }, orderBy: { createdAt: 'desc' } });
  }
}
