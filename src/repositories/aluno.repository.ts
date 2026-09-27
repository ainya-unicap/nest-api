import { prisma } from '../prisma';

export class AlunoRepository {
  // Só id + createdAt: o suficiente para contar formulários e semanas distintas.
  findAllFormularios(userId: string) {
    return prisma.formulario.findMany({ where: { user_id: userId }, select: { id: true, createdAt: true } });
  }

  contarRelatorios(userId: string) {
    return prisma.relatorio.count({ where: { user_id: userId } });
  }

  getHomeRecent(userId: string) {
    return prisma.formulario.findMany({ where: { user_id: userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, type: true, synced: true, started_at: true, ended_at: true, createdAt: true, list: { include: { plant: { select: { id: true, name: true, category: true } } } } } });
  }

  findVinculos(userId: string) {
    return prisma.userCanteiro.findMany({ where: { user_id: userId }, include: { canteiro: { include: { plant: { select: { id: true, name: true, category: true } }, _count: { select: { listaDeFormularios: true } } } } } });
  }

  contarListas(canteiroIds: string[]) {
    return prisma.listaDeFormularios.count({ where: { canteiro_id: { in: canteiroIds } } });
  }
}
