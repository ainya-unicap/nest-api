import { prisma } from '../prisma';

export class RelatorioRepository {
  getRelatoriosByUser(userId: string) {
    return prisma.relatorio.findMany({ where: { user_id: userId }, include: { list: { include: { plant: { select: { name: true } } } }, canteiro: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }

  createRelatorio(data: any) {
    return prisma.relatorio.create({ data });
  }

  // A lista informa o canteiro e a planta usados para montar o relatório.
  findListaComPlanta(listId: string) {
    return prisma.listaDeFormularios.findUnique({ where: { id: listId }, include: { plant: true } });
  }

  findById(id: string) {
    return prisma.relatorio.findUnique({ where: { id }, include: { list: { include: { plant: true } }, canteiro: true } });
  }

  // Versão enxuta, para checagem de dono e de status antes de alterar.
  findRaw(id: string) {
    return prisma.relatorio.findUnique({ where: { id } });
  }

  update(id: string, data: any) {
    return prisma.relatorio.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.relatorio.delete({ where: { id } });
  }
}
