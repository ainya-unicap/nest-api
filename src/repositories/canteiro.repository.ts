import { prisma } from '../prisma';

export class CanteiroRepository {
  // Devolve os vínculos; o service extrai o canteiro de dentro de cada um.
  findVinculosByUser(userId: string) {
    return prisma.userCanteiro.findMany({ where: { user_id: userId }, include: { canteiro: { include: { plant: { select: { id: true, name: true, category: true } }, listaDeFormularios: { include: { plant: { select: { id: true, name: true } }, _count: { select: { formularios: true } } } } } } } });
  }

  create(data: { plant_id: string; name: string }) {
    return prisma.canteiro.create({ data });
  }

  // Canteiro + vínculo do usuário + lista, tudo ou nada: se qualquer passo
  // falhar, nada fica gravado (resolve o canteiro órfão sem lista).
  async createComListaETransacao(data: {
    name: string;
    plant_id: string;
    userId: string;
    listName: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const canteiro = await tx.canteiro.create({
        data: { name: data.name, plant_id: data.plant_id },
      });

      await tx.userCanteiro.create({
        data: { user_id: data.userId, canteiro_id: canteiro.id },
      });

      await tx.listaDeFormularios.create({
        data: {
          canteiro_id: canteiro.id,
          plant_id: data.plant_id,
          created_by: data.userId,
          name: data.listName,
        },
      });

      // Recarrega já com o formato de saída pedido: planta + a lista criada.
      return tx.canteiro.findUniqueOrThrow({
        where: { id: canteiro.id },
        include: {
          plant: { select: { id: true, name: true, category: true } },
          listaDeFormularios: { select: { id: true, name: true } },
        },
      });
    });
  }

  findListasByCanteiro(canteiroId: string) {
    return prisma.listaDeFormularios.findMany({ where: { canteiro_id: canteiroId }, include: { plant: { select: { id: true, name: true, category: true } }, _count: { select: { formularios: true } } }, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return prisma.canteiro.findUnique({ where: { id } });
  }

  // Organizado por lista: cada lista já vem com todos os seus formulários
  // (campos fixos + fotos) — sem precisar de uma segunda chamada por lista.
  findFormulariosByCanteiro(canteiroId: string) {
    return prisma.listaDeFormularios.findMany({
      where: { canteiro_id: canteiroId },
      include: {
        plant: { select: { id: true, name: true, category: true } },
        formularios: {
          orderBy: { date: 'asc' },
          include: { photos: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
