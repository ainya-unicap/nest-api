import { Injectable } from '@nestjs/common';
import { AlunoRepository } from '../repositories/aluno.repository';
import { HttpError } from '../core/httpError';

type FormularioResumo = { id: string; createdAt: Date };

// Quantas semanas distintas do calendário têm pelo menos um formulário.
function calcularSemanasUnicas(formularios: FormularioResumo[]): number {
  const semanas = new Set(
    formularios.map((formulario) => {
      const createdAt = new Date(formulario.createdAt);
      const year = createdAt.getFullYear();

      const startOfYear = new Date(year, 0, 1);
      const diffInDays = Math.floor((createdAt.getTime() - startOfYear.getTime()) / 86400000);
      const week = Math.ceil((diffInDays + startOfYear.getDay() + 1) / 7);

      return `${year}-${week}`;
    }),
  );

  return semanas.size;
}

@Injectable()
export class AlunoService {
  private readonly repo = new AlunoRepository();

  // Devolve os totais consolidados — não a lista crua de formulários.
  async getResumo(userId: string) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const formularios = await this.repo.findAllFormularios(userId);
    const totalRelatorios = await this.repo.contarRelatorios(userId);

    return {
      total_formularios: formularios.length,
      total_semanas: calcularSemanasUnicas(formularios),
      total_relatorios: totalRelatorios,
    };
  }

  async getHome(userId: string) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const formulariosRecentes = await this.repo.getHomeRecent(userId);
    const todosFormularios = await this.repo.findAllFormularios(userId);
    const vinculos = await this.repo.findVinculos(userId);

    const canteiros = vinculos.map((v) => v.canteiro);
    const totalListas = await this.repo.contarListas(canteiros.map((c) => c.id));
    const totalRelatorios = await this.repo.contarRelatorios(userId);

    return {
      formularios_recentes: formulariosRecentes,
      canteiros,
      total_listas: totalListas,
      total_formularios: todosFormularios.length,
      total_semanas: calcularSemanasUnicas(todosFormularios),
      total_relatorios: totalRelatorios,
    };
  }
}
