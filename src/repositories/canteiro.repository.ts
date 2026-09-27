import { prisma } from '../prisma';

export class CanteiroRepository {
  // Devolve os vínculos; o service extrai o canteiro de dentro de cada um.
  findVinculosByUser(userId: string) {
    return prisma.userCanteiro.findMany({ where: { user_id: userId }, include: { canteiro: { include: { plant: { select: { id: true, name: true, category: true } }, listaDeFormularios: { include: { plant: { select: { id: true, name: true } }, _count: { select: { formularios: true } } } } } } } });
  }

  create(data: { plant_id: string; name: string }) {
    return prisma.canteiro.create({ data });
  }

  vincularUsuario(user_id: string, canteiro_id: string) {
    return prisma.userCanteiro.create({ data: { user_id, canteiro_id } });
  }

  findListasByCanteiro(canteiroId: string) {
    return prisma.listaDeFormularios.findMany({ where: { canteiro_id: canteiroId }, include: { plant: { select: { id: true, name: true, category: true } }, _count: { select: { formularios: true } } }, orderBy: { createdAt: 'desc' } });
  }
}
