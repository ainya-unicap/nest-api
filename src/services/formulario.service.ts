import { Injectable } from '@nestjs/common';
import { FormularioRepository } from '../repositories/formulario.repository';
import { HttpError, erroDeCampos } from '../core/httpError';

const TIPOS_VALIDOS = ['SEMANAL', 'DIARIO'];
const SEMANA_MIN = 1;
const SEMANA_MAX = 12;

@Injectable()
export class FormularioService {
  private repo = new FormularioRepository();

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

  findAllByUser(user_id: string) {
    if (!user_id) throw new HttpError('user_id is required', 400);
    return this.repo.findManyByUser(user_id);
  }

  // started_at, ended_at e observations são NOT NULL sem default no banco:
  // se não forem preenchidos aqui, o Prisma recusa o insert.
  //
  // A validação é acumulada em `campos` e só então lançada: o cliente recebe
  // TUDO que está errado de uma vez, em vez de descobrir um problema por
  // tentativa.
  create(body: any) {
    const { list_id, user_id, observations, week } = body ?? {};
    const campos: Record<string, string> = {};

    if (!list_id) campos.list_id = 'obrigatório';
    if (!user_id) campos.user_id = 'obrigatório';
    if (!body?.type) campos.type = `obrigatório (${TIPOS_VALIDOS.join(' ou ')})`;

    const tipo = this.lerTipo(body?.type, campos);
    const semana = this.lerSemana(week, campos);
    const inicio = this.lerData(body?.started_at, 'started_at', campos);
    const fim = this.lerData(body?.ended_at, 'ended_at', campos);

    if (Object.keys(campos).length > 0) {
      throw erroDeCampos(campos, 'FORMULARIO_INVALIDO');
    }

    const agora = new Date();

    return this.repo.create({
      list_id,
      user_id,
      type: tipo,
      week: semana ?? null,
      started_at: inicio ?? agora,
      ended_at: fim ?? agora,
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

  getChecklist(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    return this.repo.getChecklist(id);
  }

  getMeasurements(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    return this.repo.getMeasurements(id);
  }

  getPhotos(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    return this.repo.getPhotos(id);
  }

  update(id: string, body: any) {
    if (!id) throw new HttpError('id é obrigatório', 400, { codigo: 'CAMPO_OBRIGATORIO' });

    const { observations, week, synced } = body ?? {};
    const campos: Record<string, string> = {};

    const tipo = this.lerTipo(body?.type, campos);
    const semana = this.lerSemana(week, campos);
    const inicio = this.lerData(body?.started_at, 'started_at', campos);
    const fim = this.lerData(body?.ended_at, 'ended_at', campos);

    if (synced !== undefined && typeof synced !== 'boolean') {
      campos.synced = `deve ser true ou false (recebido: ${JSON.stringify(synced)})`;
    }

    if (Object.keys(campos).length > 0) {
      throw erroDeCampos(campos, 'FORMULARIO_INVALIDO');
    }

    return this.repo.update(id, {
      type: tipo,
      week: semana,
      observations,
      started_at: inicio,
      ended_at: fim,
      synced,
    });
  }

  // Só o dono apaga, e os filhos (checklist/measurements/photos) saem junto:
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

  sync(id: string, body: any) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    return this.repo.sync(id, body);
  }
}
