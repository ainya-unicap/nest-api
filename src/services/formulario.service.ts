import { Injectable } from '@nestjs/common';
import { FormularioRepository } from '../repositories/formulario.repository';
import { PhotoRepository } from '../repositories/photo.repository';
import { LIMITE_FOTOS_POR_FORMULARIO } from './photo.service';
import { HttpError, erroDeCampos } from '../core/httpError';

const TIPOS_VALIDOS = ['SEMANAL', 'DIARIO'];
const SEMANA_MIN = 1;
const SEMANA_MAX = 12;
const CLIMAS_VALIDOS = ['SOL', 'NUBLADO', 'CHUVA'];
const ESTADIOS_VALIDOS = ['VEGETATIVO', 'ELONGACAO', 'FLORESCIMENTO'];

// Chaves do checklist fixo (iguais para qualquer planta — não depende mais
// de PlantTemplate). O nome da coluna no banco é o valor à direita.
const CHECKLIST_CAMPOS = {
  checklist_irrigacao: 'checklist_irrigacao',
  checklist_capina: 'checklist_capina',
  checklist_adubacao: 'checklist_adubacao',
  checklist_plantio: 'checklist_plantio',
  checklist_pragas: 'checklist_pragas',
} as const;

@Injectable()
export class FormularioService {
  private repo = new FormularioRepository();
  private photoRepo = new PhotoRepository();

  /** Devolve a data ou registra o problema em `campos`. */
  private lerData(
    valor: unknown,
    campo: string,
    campos: Record<string, string>,
  ): Date | undefined {
    if (valor === undefined || valor === null || valor === '') return undefined;

    const data = new Date(valor as string);
    if (Number.isNaN(data.getTime())) {
      campos[campo] = `data inválida (recebido: ${JSON.stringify(valor)})`;
      return undefined;
    }

    return data;
  }

  /** Normaliza o tipo e registra o problema se não for um dos aceitos. */
  private lerTipo(valor: unknown, campos: Record<string, string>): string | undefined {
    if (valor === undefined || valor === null || valor === '') return undefined;

    const normalizado = String(valor).trim().toUpperCase();
    if (!TIPOS_VALIDOS.includes(normalizado)) {
      campos.type = `deve ser ${TIPOS_VALIDOS.join(' ou ')} (recebido: ${JSON.stringify(valor)})`;
      return undefined;
    }

    return normalizado;
  }

  /** Valida a semana do acompanhamento (1 a 12). */
  private lerSemana(valor: unknown, campos: Record<string, string>): number | undefined {
    if (valor === undefined || valor === null || valor === '') return undefined;

    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < SEMANA_MIN || numero > SEMANA_MAX) {
      campos.week =
        `deve ser um número inteiro entre ${SEMANA_MIN} e ${SEMANA_MAX} ` +
        `(recebido: ${JSON.stringify(valor)})`;
      return undefined;
    }

    return numero;
  }

  /** Normaliza a condição do tempo (Sol/Nublado/Chuva). */
  private lerClima(valor: unknown, campos: Record<string, string>): string | undefined {
    if (valor === undefined || valor === null || valor === '') return undefined;

    const normalizado = String(valor).trim().toUpperCase();
    if (!CLIMAS_VALIDOS.includes(normalizado)) {
      campos.weather = `deve ser ${CLIMAS_VALIDOS.join(', ')} (recebido: ${JSON.stringify(valor)})`;
      return undefined;
    }

    return normalizado;
  }

  /**
   * Normaliza o estádio fenológico (Vegetativo/Elongação/Florescimento).
   *
   * O campo é opcional, então a resposta tem três estados: `undefined` = a
   * chave não veio no corpo (não mexe no que está gravado), `null` = veio
   * vazia (limpa a coluna), string = valor validado. Sem essa distinção o
   * update não teria como APAGAR a fase já salva — `undefined` o Prisma
   * entende como "não alterar".
   */
  private lerEstadio(body: any, campos: Record<string, string>): string | null | undefined {
    if (!body || !('phenological_stage' in body)) return undefined;

    const valor = body.phenological_stage;
    if (valor === undefined) return undefined;
    if (valor === null || String(valor).trim() === '') return null;

    const normalizado = String(valor)
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, ''); // remove acento: "Elongação" -> "ELONGACAO"

    if (!ESTADIOS_VALIDOS.includes(normalizado)) {
      campos.phenological_stage =
        `deve ser ${ESTADIOS_VALIDOS.join(', ')}, ou vir vazio ` +
        `(recebido: ${JSON.stringify(valor)})`;
      return undefined;
    }

    return normalizado;
  }

  /**
   * Altura estimada em cm — número finito e não negativo.
   *
   * Opcional, com os mesmos três estados de `lerEstadio`: `undefined` =
   * chave ausente, `null` = enviada vazia (limpa a coluna), número = valor
   * validado.
   */
  private lerAltura(body: any, campos: Record<string, string>): number | null | undefined {
    if (!body || !('estimated_height_cm' in body)) return undefined;

    const valor = body.estimated_height_cm;
    if (valor === undefined) return undefined;
    if (valor === null || String(valor).trim() === '') return null;

    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
      campos.estimated_height_cm =
        `deve ser um número maior ou igual a 0, ou vir vazio ` +
        `(recebido: ${JSON.stringify(valor)})`;
      return undefined;
    }

    return numero;
  }

  /**
   * Lê os 5 itens do checklist fixo.
   *
   * Em `completar: true` (criação) cada item omitido vira `false` — o
   * registro nasce com os 5 campos definidos. Em `completar: false`
   * (atualização parcial) um item omitido fica de fora do resultado, pra não
   * sobrescrever com `false` o que já estava `true` no banco.
   */
  private lerChecklist(
    body: any,
    campos: Record<string, string>,
    completar: boolean,
  ): Record<string, boolean> {
    const resultado: Record<string, boolean> = {};

    for (const chave of Object.values(CHECKLIST_CAMPOS)) {
      const valor = body?.[chave];
      if (valor === undefined || valor === null) {
        if (completar) resultado[chave] = false;
        continue;
      }
      if (typeof valor !== 'boolean') {
        campos[chave] = `deve ser true ou false (recebido: ${JSON.stringify(valor)})`;
        continue;
      }
      resultado[chave] = valor;
    }

    return resultado;
  }

  findAllByUser(user_id: string) {
    if (!user_id) throw new HttpError('user_id is required', 400);
    return this.repo.findManyByUser(user_id);
  }

  // A validação é acumulada em `campos` e só então lançada: o cliente recebe
  // TUDO que está errado de uma vez, em vez de descobrir um problema por
  // tentativa.
  create(body: any) {
    const { list_id, user_id, observations, week } = body ?? {};
    const campos: Record<string, string> = {};

    if (!list_id) campos.list_id = 'obrigatório';
    if (!user_id) campos.user_id = 'obrigatório';
    if (!body?.type) campos.type = `obrigatório (${TIPOS_VALIDOS.join(' ou ')})`;
    if (!body?.title) campos.title = 'obrigatório';
    if (!body?.weather) campos.weather = `obrigatório (${CLIMAS_VALIDOS.join(', ')})`;
    // estimated_height_cm e phenological_stage são opcionais no app: se vierem
    // preenchidos a validação abaixo continua valendo; vazios ou ausentes
    // gravam null.

    const tipo = this.lerTipo(body?.type, campos);
    const semana = this.lerSemana(week, campos);
    const clima = this.lerClima(body?.weather, campos);
    const estadio = this.lerEstadio(body, campos);
    const altura = this.lerAltura(body, campos);
    const data = this.lerData(body?.date, 'date', campos);
    const checklist = this.lerChecklist(body, campos, true);

    if (Object.keys(campos).length > 0) {
      throw erroDeCampos(campos, 'FORMULARIO_INVALIDO');
    }

    return this.repo.create({
      list_id,
      user_id,
      type: tipo,
      title: body.title,
      date: data ?? new Date(),
      week: semana ?? null,
      weather: clima,
      // `?? null` cobre os dois caminhos de "em branco": chave ausente
      // (undefined) e chave enviada vazia (null).
      estimated_height_cm: altura ?? null,
      phenological_stage: estadio ?? null,
      ...checklist,
      observations: observations ?? '',
      synced: false,
    });
  }

  async findById(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    const formulario = await this.repo.findById(id);
    if (!formulario) throw new HttpError('Formulário não encontrado', 404);

    return formulario;
  }

  getPhotos(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    return this.repo.getPhotos(id);
  }

  update(id: string, body: any) {
    if (!id) throw new HttpError('id é obrigatório', 400, { codigo: 'CAMPO_OBRIGATORIO' });

    const { observations, week, synced, title } = body ?? {};
    const campos: Record<string, string> = {};

    const tipo = this.lerTipo(body?.type, campos);
    const semana = this.lerSemana(week, campos);
    const clima = this.lerClima(body?.weather, campos);
    // Aqui o valor vai cru pro Prisma de propósito: undefined não altera a
    // coluna, null a limpa — é o que permite apagar a altura/fase já salva.
    const estadio = this.lerEstadio(body, campos);
    const altura = this.lerAltura(body, campos);
    const data = this.lerData(body?.date, 'date', campos);

    const checklistEnviado = Object.values(CHECKLIST_CAMPOS).some((c) => body?.[c] !== undefined);
    const checklist = checklistEnviado ? this.lerChecklist(body, campos, false) : {};

    if (title !== undefined && !title) {
      campos.title = 'não pode ficar vazio';
    }

    if (synced !== undefined && typeof synced !== 'boolean') {
      campos.synced = `deve ser true ou false (recebido: ${JSON.stringify(synced)})`;
    }

    if (Object.keys(campos).length > 0) {
      throw erroDeCampos(campos, 'FORMULARIO_INVALIDO');
    }

    return this.repo.update(id, {
      type: tipo,
      title,
      date: data,
      week: semana,
      weather: clima,
      estimated_height_cm: altura,
      phenological_stage: estadio,
      ...checklist,
      observations,
      synced,
    });
  }

  // Só o dono apaga, e as fotos saem junto:
  // as FKs no banco são ON DELETE RESTRICT, então sem isso o delete falha.
  async delete(id: string, userId?: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    const formulario = await this.repo.findRaw(id);
    if (!formulario) throw new HttpError('Formulário não encontrado', 404);

    if (!userId || formulario.user_id !== userId) {
      throw new HttpError('Você só pode deletar os próprios formulários', 403);
    }

    await this.repo.deleteWithChildren(id);
    return formulario;
  }

  finalizar(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    return this.repo.finalizar(id);
  }

  async sync(id: string, body: any) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    // Mesmo limite do upload normal — sem isso o sync offline furava a regra.
    const novasFotos = Array.isArray(body?.photos) ? body.photos.length : 0;
    if (novasFotos > 0) {
      const atual = await this.photoRepo.countByFormulario(id);
      if (atual + novasFotos > LIMITE_FOTOS_POR_FORMULARIO) {
        throw new HttpError(
          `Limite de ${LIMITE_FOTOS_POR_FORMULARIO} fotos por formulário atingido ` +
            `(já tem ${atual}, tentando adicionar ${novasFotos})`,
          400,
          { codigo: 'LIMITE_FOTOS_ATINGIDO' },
        );
      }
    }

    return this.repo.sync(id, {
      ...body,
      formulario: this.normalizarOpcionaisDoSync(body?.formulario),
    });
  }

  /**
   * No sync o app manda o formulário inteiro como preencheu offline. Para os
   * dois campos opcionais, "" significa "deixei em branco" — sem traduzir
   * para null o Prisma recusaria a string vazia num Float e o sync voltaria
   * 400. Chave ausente continua significando "não alterar".
   */
  private normalizarOpcionaisDoSync(formulario: any) {
    if (!formulario || typeof formulario !== 'object') return formulario;

    const copia = { ...formulario };
    for (const campo of ['estimated_height_cm', 'phenological_stage'] as const) {
      if (copia[campo] === '') copia[campo] = null;
    }

    return copia;
  }
}
