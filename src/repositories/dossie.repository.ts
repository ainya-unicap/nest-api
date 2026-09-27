import { prisma } from '../prisma';

export class DossieRepository {
  // Lista + planta + canteiro: o cabeçalho do dossiê.
  findLista(listId: string) {
    return prisma.listaDeFormularios.findUnique({
      where: { id: listId },
      include: { plant: true, canteiro: true },
    });
  }

  // Todos os formulários da lista com os filhos, em ordem cronológica.
  // Traz o autor porque uma lista pode receber formulários de vários alunos
  // (user_id fica no formulário, não na lista).
  findFormularios(listId: string) {
    return prisma.formulario.findMany({
      where: { list_id: listId },
      orderBy: [{ started_at: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { id: true, name: true } },
        measurements: {
          include: {
            template: { select: { field_name: true, unit: true, field_type: true } },
          },
        },
        checklists: {
          include: {
            template: { select: { field_name: true, unit: true } },
          },
        },
        photos: { select: { id: true, url: true, takenAt: true } },
      },
    });
  }
}
