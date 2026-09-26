import { Injectable } from '@nestjs/common';

import { DossieRepository } from '../repositories/dossie.repository';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';
import { HttpError } from '../core/httpError';

// Contrato enviado ao serviço de IA. Mudou aqui, mudou lá — manter em sincronia
// com ai-service/schema.py.
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

    const datas = formularios.map((f) => f.started_at ?? f.createdAt);
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

  // Agrupa por field_name + unit, NUNCA por template_id: o seed chegou a criar
  // templates duplicados e a mesma métrica ficou dividida em dois ids — agrupar
  // por template quebraria a série no meio.
  private metricas(formularios: any[]): Array<MetricaNumerica | MetricaCategorica> {
    const grupos = new Map<string, { template: any; pontos: Array<{ data: Date; valor: number }> }>();

    for (const f of formularios) {
      const data = f.started_at ?? f.createdAt;

      // Um ponto por (formulário, campo). Sem @@unique(form_id, template_id) o
      // banco aceita a mesma medição repetida no mesmo formulário — e o
      // skipDuplicates do sync não protege nada. Fica a leitura mais recente,
      // senão a série ganharia dois pontos na mesma data.
      const ultimoPorCampo = new Map<string, any>();
      for (const m of f.measurements) {
        const chave = `${m.template.field_name}|${m.template.unit}`;
        const anterior = ultimoPorCampo.get(chave);
        if (!anterior || m.createdAt >= anterior.createdAt) ultimoPorCampo.set(chave, m);
      }

      for (const [chave, m] of ultimoPorCampo) {
        if (!grupos.has(chave)) grupos.set(chave, { template: m.template, pontos: [] });
        grupos.get(chave)!.pontos.push({ data, valor: m.value });
      }
    }

    const metricas: Array<MetricaNumerica | MetricaCategorica> = [];

    for (const { template, pontos } of grupos.values()) {
      pontos.sort((a, b) => a.data.getTime() - b.data.getTime());

      if (template.field_type === 'CATEGORICO') {
        // Em campo categórico o "unit" guarda as opções e o "value" é o índice.
        const opcoes = template.unit.split('/').map((o: string) => o.trim());
        const rotulo = (v: number) => opcoes[Math.round(v)] ?? `opção ${v}`;
        const serie = pontos.map((p) => ({ data: soData(p.data), valor: rotulo(p.valor) }));

        metricas.push({
          campo: template.field_name,
          tipo: 'categorico',
          opcoes,
          leituras: serie.length,
          primeiro: serie[0].valor,
          ultimo: serie[serie.length - 1].valor,
          serie,
        });
        continue;
      }

      const valores = pontos.map((p) => p.valor);
      const primeiro = valores[0];
      const ultimo = valores[valores.length - 1];

      metricas.push({
        campo: template.field_name,
        unidade: template.unit,
        tipo: 'numerico',
        leituras: valores.length,
        primeiro,
        ultimo,
        min: Math.min(...valores),
        max: Math.max(...valores),
        media: arredonda(valores.reduce((a, b) => a + b, 0) / valores.length),
        // Os números vêm calculados daqui de propósito: LLM erra aritmética.
        variacao_pct: primeiro === 0 ? null : arredonda(((ultimo - primeiro) / Math.abs(primeiro)) * 100, 1),
        serie: pontos.map((p) => ({ data: soData(p.data), valor: p.valor })),
      });
    }

    return metricas.sort((a, b) => a.campo.localeCompare(b.campo));
  }

  private checklist(formularios: any[]) {
    const mapa = new Map<string, { marcado: number; total: number }>();

    for (const f of formularios) {
      for (const c of f.checklists) {
        const nome = c.template.field_name;
        const atual = mapa.get(nome) ?? { marcado: 0, total: 0 };
        atual.total += 1;
        if (c.checked) atual.marcado += 1;
        mapa.set(nome, atual);
      }
    }

    return [...mapa.entries()]
      .map(([item, v]) => ({ item, marcado: v.marcado, total: v.total, pct: arredonda((v.marcado / v.total) * 100, 1) }))
      .sort((a, b) => a.item.localeCompare(b.item));
  }

  // Texto livre do aluno: é o insumo qualitativo principal (praga, chuva, poda).
  private observacoes(formularios: any[]) {
    return formularios
      .filter((f) => (f.observations ?? '').trim().length > 0)
      .map((f) => ({
        data: soData(f.started_at ?? f.createdAt),
        autor: f.user?.name ?? 'desconhecido',
        texto: f.observations.trim(),
      }));
  }
}
