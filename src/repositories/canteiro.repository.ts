import { prisma } from '../prisma';

const STATUS_FECHADOS = ['SUBMETIDO', 'CORRIGIDO'];

export class CanteiroRepository {
  // Devolve os vínculos; o service extrai o canteiro de dentro de cada um.
  findVinculosByUser(userId: string) {
    return prisma.userCanteiro.findMany({ where: { user_id: userId }, include: { canteiro: { include: { plant: { select: { id: true, name: true, category: true } }, listaDeFormularios: { include: { plant: { select: { id: true, name: true } }, _count: { select: { formularios: true } }, formularios: { orderBy: { date: 'desc' }, take: 1, select: { id: true, date: true } } } } } } } });
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

  temOutroVinculo(canteiroId: string, userId: string) {
    return prisma.userCanteiro
      .count({ where: { canteiro_id: canteiroId, user_id: { not: userId } } })
      .then((total) => total > 0);
  }

  existeRelatorioFechado(canteiroId: string) {
    return prisma.relatorio
      .findFirst({ where: { canteiro_id: canteiroId, status: { in: STATUS_FECHADOS } } })
      .then((r) => !!r);
  }

  // Apaga tudo o que pertence ao canteiro, na ordem exigida pelas FKs
  // (RESTRICT): fotos -> formulários -> relatórios -> listas -> vínculos ->
  // canteiro. Devolve as urls das fotos para o service remover os arquivos
  // só depois que a transação confirmar.
  async deleteCanteiroCompleto(canteiroId: string): Promise<string[]> {
    return prisma.$transaction(async (tx) => {
      const listas = await tx.listaDeFormularios.findMany({
        where: { canteiro_id: canteiroId },
        select: { id: true },
      });
      const listaIds = listas.map((l) => l.id);

      const formularios = await tx.formulario.findMany({
        where: { list_id: { in: listaIds } },
        select: { id: true },
      });
      const formularioIds = formularios.map((f) => f.id);

      const fotos = await tx.photo.findMany({
        where: { form_id: { in: formularioIds } },
        select: { url: true },
      });

      await tx.photo.deleteMany({ where: { form_id: { in: formularioIds } } });
      await tx.formulario.deleteMany({ where: { id: { in: formularioIds } } });
      // Só RASCUNHO chega aqui: o service já barrou SUBMETIDO/CORRIGIDO antes de chamar isto.
      await tx.relatorio.deleteMany({ where: { canteiro_id: canteiroId } });
      await tx.listaDeFormularios.deleteMany({ where: { canteiro_id: canteiroId } });
      await tx.userCanteiro.deleteMany({ where: { canteiro_id: canteiroId } });
      await tx.canteiro.delete({ where: { id: canteiroId } });

      return fotos.map((f) => f.url);
    });
  }
}
