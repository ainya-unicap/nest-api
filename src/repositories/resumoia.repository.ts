import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';

// Para listagens: o dossiê e as seções são grandes e só interessam na consulta
// de um item específico.
const RESUMO_SEM_CONTEUDO = {
  id: true,
  status: true,
  modelo: true,
  prompt_versao: true,
  tokens_entrada: true,
  tokens_saida: true,
  duracao_ms: true,
  erro: true,
  createdAt: true,
  concluidoEm: true,
} satisfies Prisma.ResumoIASelect;

export class ResumoIaRepository {
  criar(data: Prisma.ResumoIAUncheckedCreateInput) {
    return prisma.resumoIA.create({ data });
  }

  findById(id: string) {
    return prisma.resumoIA.findUnique({ where: { id } });
  }

  findByLista(listId: string) {
    return prisma.resumoIA.findMany({
      where: { list_id: listId },
      orderBy: { createdAt: 'desc' },
      select: RESUMO_SEM_CONTEUDO,
    });
  }

  findByCanteiro(canteiroId: string) {
    return prisma.resumoIA.findMany({
      where: { list: { canteiro_id: canteiroId } },
      orderBy: { createdAt: 'desc' },
      select: { ...RESUMO_SEM_CONTEUDO, list_id: true },
    });
  }

  findCanteiro(canteiroId: string) {
    return prisma.canteiro.findUnique({ where: { id: canteiroId }, select: { id: true } });
  }

  // A lista que alimenta o resumo de um canteiro: a mais recente que já tem
  // formulário. Listas vazias ficam de fora — o dossiê recusaria com 422.
  findListaComFormularios(canteiroId: string) {
    return prisma.listaDeFormularios.findFirst({
      where: { canteiro_id: canteiroId, formularios: { some: {} } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
  }

  atualizar(id: string, data: Prisma.ResumoIAUncheckedUpdateInput) {
    return prisma.resumoIA.update({ where: { id }, data });
  }
}
