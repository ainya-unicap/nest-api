import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';

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
      // O dossiê é grande e só interessa na auditoria de um item específico.
      select: {
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
      },
    });
  }

  atualizar(id: string, data: Prisma.ResumoIAUncheckedUpdateInput) {
    return prisma.resumoIA.update({ where: { id }, data });
  }
}
