import { Injectable } from '@nestjs/common';
import { AlunoRepository } from '../repositories/aluno.repository';
import { HttpError } from '../core/httpError';

type FormularioResumo = { id: string; week: number | null };

// Quantas semanas distintas (1 a 12) do acompanhamento já têm formulário —
// usa o número que o próprio aluno escolhe ao preencher, não mais uma
// estimativa a partir da data de criação do registro.
function calcularSemanasUnicas(formularios: FormularioResumo[]): number {
  const semanas = new Set(
    formularios.map((f) => f.week).filter((w): w is number => w !== null),
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
