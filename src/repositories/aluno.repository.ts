import { prisma } from '../prisma';

export class AlunoRepository {
  getResumo(userId: string) {
    return prisma.formulario.findMany({ where: { user_id: userId }, select: { id: true, createdAt: true } });
  }

  getHomeRecent(userId: string) {
    return prisma.formulario.findMany({ where: { user_id: userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, type: true, synced: true, started_at: true, ended_at: true, createdAt: true, list: { include: { plant: { select: { id: true, name: true, category: true } } } } } });
  }

  findAllFormularios(userId: string) {
    return prisma.formulario.findMany({ where: { user_id: userId }, select: { id: true, createdAt: true } });
  }

  findVinculos(userId: string) {
    return prisma.userCanteiro.findMany({ where: { user_id: userId }, include: { canteiro: { include: { plant: { select: { id: true, name: true, category: true } }, _count: { select: { listaDeFormularios: true } } } } } });
  }
}
