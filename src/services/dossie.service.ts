import { Injectable } from '@nestjs/common';

import { DossieRepository } from '../repositories/dossie.repository';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';
import { HttpError } from '../core/httpError';

// Contrato enviado ao serviço de IA. Mudou aqui, mudou lá — manter em sincronia
// com src/ai/schemas/dossie.ts.
export const DOSSIE_VERSAO = '1';

export interface MetricaNumerica {
  campo: string;
  unidade: string;
  tipo: 'numerico';
  leituras: number;
  primeiro: number;
  ultimo: number;
  min: number;
  max: number;
  media: number;
  variacao_pct: number | null;
  serie: Array<{ data: string; valor: number }>;
}

export interface MetricaCategorica {
  campo: string;
  tipo: 'categorico';
  opcoes: string[];
  leituras: number;
  primeiro: string;
  ultimo: string;
  serie: Array<{ data: string; valor: string }>;
}

const arredonda = (n: number, casas = 2) => Number(n.toFixed(casas));
const soData = (d: Date) => d.toISOString().slice(0, 10);

// Rótulos legíveis dos valores fixos gravados no banco em maiúsculas/sem acento.
const ROTULOS_ESTADIO: Record<string, string> = {
  VEGETATIVO: 'vegetativo',
  ELONGACAO: 'elongação',
  FLORESCIMENTO: 'florescimento',
};
const ROTULOS_CLIMA: Record<string, string> = {
  SOL: 'sol',
  NUBLADO: 'nublado',
  CHUVA: 'chuva',
};

// Os 5 itens fixos do checklist, na ordem em que aparecem no formulário.
const ITENS_CHECKLIST: Array<{ campo: string; item: string }> = [
  { campo: 'checklist_irrigacao', item: 'Irrigação verificada' },
  { campo: 'checklist_capina', item: 'Capina realizada' },
  { campo: 'checklist_adubacao', item: 'Adubação de cobertura' },
  { campo: 'checklist_plantio', item: 'Plantio/Replantio' },
  { campo: 'checklist_pragas', item: 'Controle de pragas' },
];

@Injectable()
export class DossieService {
  private readonly repo = new DossieRepository();
  private readonly userCanteiroRepo = new UserCanteiroRepository();

  async montar(listId: string, userId: string) {
    if (!listId) throw new HttpError('listId é obrigatório', 400);
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const lista = await this.repo.findLista(listId);
    if (!lista) throw new HttpError('Lista de formulários não encontrada', 404);

    // Regra única de acesso: basta estar vinculado ao canteiro. Se só uma pessoa
    // estiver vinculada, só ela passa; se houver várias, todas passam e o dossiê
    // considera os formulários de todo mundo.
    const vinculado = await this.userCanteiroRepo.exists(userId, lista.canteiro_id);
    if (!vinculado) {
      throw new HttpError('Usuário não está vinculado ao canteiro desta lista', 403);
    }

    const formularios = await this.repo.findFormularios(listId);
    if (formularios.length === 0) {
      throw new HttpError('A lista ainda não tem formulários preenchidos', 422);
    }

    const datas = formularios.map((f) => f.date ?? f.createdAt);
    const inicio = datas[0];
    const fim = datas[datas.length - 1];

    return {
      versao: DOSSIE_VERSAO,
      gerado_em: new Date().toISOString(),
      lista: { id: lista.id, nome: lista.name },
      planta: {
        nome: lista.plant.name,
        categoria: lista.plant.category,
        descricao: lista.plant.description,
        foco_semestre: lista.plant.semester_focus,
      },
      canteiro: { id: lista.canteiro.id, nome: lista.canteiro.name },
      periodo: {
        inicio: soData(inicio),
        fim: soData(fim),
        semanas: this.semanasEntre(inicio, fim),
        total_formularios: formularios.length,
        autores: this.autores(formularios),
      },
      metricas: this.metricas(formularios),
      checklist: this.checklist(formularios),
      observacoes: this.observacoes(formularios),
      fotos: { total: formularios.reduce((acc, f) => acc + f.photos.length, 0) },
    };
  }

  private semanasEntre(inicio: Date, fim: Date) {
    const dias = Math.round((fim.getTime() - inicio.getTime()) / 86_400_000);
    return Math.max(1, Math.round(dias / 7) + 1);
  }

  private autores(formularios: any[]) {
    const mapa = new Map<string, { nome: string; formularios: number }>();
    for (const f of formularios) {
      const atual = mapa.get(f.user_id) ?? { nome: f.user?.name ?? 'desconhecido', formularios: 0 };
      atual.formularios += 1;
      mapa.set(f.user_id, atual);
    }
    return [...mapa.values()];
  }

  // Três métricas fixas, direto das colunas do Formulario — substituem as
  // medições configuráveis por planta (PlantTemplate/Measurement, removidos).
  private metricas(formularios: any[]): Array<MetricaNumerica | MetricaCategorica> {
    const metricas: Array<MetricaNumerica | MetricaCategorica> = [];

    // --- Altura estimada (cm) ------------------------------------------
    const alturas = formularios
      .filter((f) => typeof f.estimated_height_cm === 'number')
      .map((f) => ({ data: f.date ?? f.createdAt, valor: f.estimated_height_cm as number }));

    if (alturas.length > 0) {
      const valores = alturas.map((p) => p.valor);
      const primeiro = valores[0];
      const ultimo = valores[valores.length - 1];

      metricas.push({
        campo: 'Altura estimada',
        unidade: 'cm',
        tipo: 'numerico',
        leituras: valores.length,
        primeiro,
        ultimo,
        min: Math.min(...valores),
        max: Math.max(...valores),
        media: arredonda(valores.reduce((a, b) => a + b, 0) / valores.length),
        // Os números vêm calculados daqui de propósito: LLM erra aritmética.
        variacao_pct: primeiro === 0 ? null : arredonda(((ultimo - primeiro) / Math.abs(primeiro)) * 100, 1),
        serie: alturas.map((p) => ({ data: soData(p.data), valor: p.valor })),
      });
    }

    // --- Estado fenológico (categórico) --------------------------------
    const estadios = formularios
      .filter((f) => f.phenological_stage)
      .map((f) => ({
        data: f.date ?? f.createdAt,
        valor: ROTULOS_ESTADIO[f.phenological_stage] ?? f.phenological_stage,
      }));

    if (estadios.length > 0) {
      metricas.push({
        campo: 'Estado fenológico',
        tipo: 'categorico',
        opcoes: Object.values(ROTULOS_ESTADIO),
        leituras: estadios.length,
        primeiro: estadios[0].valor,
        ultimo: estadios[estadios.length - 1].valor,
        serie: estadios.map((p) => ({ data: soData(p.data), valor: p.valor })),
      });
    }

    // --- Condição do tempo (categórico) --------------------------------
    const climas = formularios
      .filter((f) => f.weather)
      .map((f) => ({ data: f.date ?? f.createdAt, valor: ROTULOS_CLIMA[f.weather] ?? f.weather }));

    if (climas.length > 0) {
      metricas.push({
        campo: 'Condição do tempo',
        tipo: 'categorico',
        opcoes: Object.values(ROTULOS_CLIMA),
        leituras: climas.length,
        primeiro: climas[0].valor,
        ultimo: climas[climas.length - 1].valor,
        serie: climas.map((p) => ({ data: soData(p.data), valor: p.valor })),
      });
    }

    return metricas;
  }

  // Checklist fixo: 5 itens, iguais para qualquer planta — substitui o
  // checklist configurável por planta (PlantTemplate/Checklist, removidos).
  private checklist(formularios: any[]) {
    const total = formularios.length;

    return ITENS_CHECKLIST.map(({ campo, item }) => {
      const marcado = formularios.filter((f) => f[campo] === true).length;
      return { item, marcado, total, pct: arredonda((marcado / total) * 100, 1) };
    });
  }

  // Texto livre do aluno: é o insumo qualitativo principal (praga, chuva, poda).
  private observacoes(formularios: any[]) {
    return formularios
      .filter((f) => (f.observations ?? '').trim().length > 0)
      .map((f) => ({
        data: soData(f.date ?? f.createdAt),
        autor: f.user?.name ?? 'desconhecido',
        texto: f.observations.trim(),
      }));
  }
}
