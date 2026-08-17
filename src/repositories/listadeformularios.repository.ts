import { prisma } from '../prisma';

export class ListaDeFormulariosRepository {
  create(data: any) {
    return prisma.listaDeFormularios.create({ data, include: { plant: { select: { id: true, name: true, category: true } } } });
  }

  findById(id: string) {
    return prisma.listaDeFormularios.findUnique({ where: { id }, include: { plant: { select: { id: true, name: true, category: true } }, formularios: { orderBy: { createdAt: 'asc' }, select: { id: true, type: true, synced: true, started_at: true, ended_at: true, createdAt: true } } } });
  }

  findByCanteiro(canteiroId: string) {
    return prisma.listaDeFormularios.findMany({ where: { canteiro_id: canteiroId }, include: { plant: { select: { id: true, name: true, category: true } }, _count: { select: { formularios: true } } }, orderBy: { createdAt: 'desc' } });
  }

  findFormularios(listaId: string) {
    return prisma.formulario.findMany({ where: { list_id: listaId }, orderBy: { createdAt: 'asc' } });
  }
}
