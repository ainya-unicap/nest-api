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
    turma_id?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const canteiro = await tx.canteiro.create({
        data: { name: data.name, plant_id: data.plant_id, turma_id: data.turma_id },
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

  // Mesmo formato de saída do POST /canteiros: planta + listas.
  findByIdComDetalhes(id: string) {
    return prisma.canteiro.findUnique({
      where: { id },
      include: {
        plant: { select: { id: true, name: true, category: true } },
        listaDeFormularios: { select: { id: true, name: true } },
      },
    });
  }

  // Formulários de todas as listas do canteiro. Usado para decidir se a troca
  // de planta ainda é permitida.
  contarFormulariosDoCanteiro(canteiroId: string) {
    return prisma.formulario.count({ where: { list: { canteiro_id: canteiroId } } });
  }

  // Atualiza o canteiro e propaga para as listas, tudo ou nada.
  //
  // `name` e `plant_id` só chegam aqui quando mudaram de verdade — o service
  // já comparou com o valor atual.
  async atualizarCanteiro(params: {
    canteiroId: string;
    nomeAntigo: string;
    name?: string;
    plant_id?: string;
    // undefined: não toca no campo. null: limpa a etiqueta de turma.
    turma_id?: string | null;
  }) {
    const { canteiroId, nomeAntigo, name, plant_id, turma_id } = params;

    return prisma.$transaction(async (tx) => {
      await tx.canteiro.update({
        where: { id: canteiroId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(plant_id !== undefined ? { plant_id } : {}),
          ...(turma_id !== undefined ? { turma_id } : {}),
        },
      });

      // A lista guarda a planta também: sem isso ela continuaria apontando
      // para a espécie antiga.
      if (plant_id !== undefined) {
        await tx.listaDeFormularios.updateMany({
          where: { canteiro_id: canteiroId },
          data: { plant_id },
        });
      }

      // Só renomeia a lista que seguia o nome do canteiro (o padrão da
      // criação). Lista com nome próprio, escolhido pelo aluno, fica intacta.
      if (name !== undefined) {
        await tx.listaDeFormularios.updateMany({
          where: { canteiro_id: canteiroId, name: nomeAntigo },
          data: { name },
        });
      }

      return tx.canteiro.findUniqueOrThrow({
        where: { id: canteiroId },
        include: {
          plant: { select: { id: true, name: true, category: true } },
          listaDeFormularios: { select: { id: true, name: true } },
        },
      });
    });
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
