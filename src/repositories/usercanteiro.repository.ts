import { prisma } from '../prisma';

export class UserCanteiroRepository {
  create(data: any) {
    return prisma.userCanteiro.create({ data });
  }

  findByUser(user_id: string) {
    return prisma.userCanteiro.findMany({ where: { user_id }, include: { canteiro: { include: { plant: { select: { id: true, name: true, category: true } } } } } });
  }

  findByCanteiro(canteiro_id: string) {
    return prisma.userCanteiro.findMany({ where: { canteiro_id }, include: { user: { select: { id: true, name: true, email: true, role: true } } } });
  }

  delete(data: { user_id: string; canteiro_id: string }) {
    return prisma.userCanteiro.delete({ where: { user_id_canteiro_id: { user_id: data.user_id, canteiro_id: data.canteiro_id } } });
  }

  exists(user_id: string, canteiro_id: string) {
    return prisma.userCanteiro.findUnique({ where: { user_id_canteiro_id: { user_id, canteiro_id } } });
  }
}
