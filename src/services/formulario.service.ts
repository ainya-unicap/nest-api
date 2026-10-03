import { Injectable } from '@nestjs/common';
import { FormularioRepository } from '../repositories/formulario.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class FormularioService {
  private repo = new FormularioRepository();

  findAllByUser(user_id: string) {
    if (!user_id) throw new HttpError('user_id is required', 400);
    return this.repo.findManyByUser(user_id);
  }

  // started_at, ended_at e observations são NOT NULL sem default no banco:
  // se não forem preenchidos aqui, o Prisma recusa o insert.
  create(body: any) {
    const { list_id, user_id, type, observations, week } = body ?? {};

    if (!list_id || !user_id || !type) {
      throw new HttpError('list_id, user_id and type are required', 400);
    }

    let weekNumber: number | null = null;
    if (week !== undefined && week !== null && week !== '') {
      weekNumber = Number(week);
      if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 12) {
        throw new HttpError('week deve ser um número inteiro entre 1 e 12', 400);
      }
    }

    return this.repo.create({
      list_id,
      user_id,
      type,
      week: weekNumber,
      started_at: body.started_at ? new Date(body.started_at) : new Date(),
      ended_at: body.ended_at ? new Date(body.ended_at) : new Date(),
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
    if (!id) throw new HttpError('id é obrigatório', 400);

    const { type, week, observations, started_at, ended_at, synced } = body ?? {};

    let weekNumber: number | undefined;
    if (week !== undefined && week !== null && week !== '') {
      weekNumber = Number(week);
      if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 12) {
        throw new HttpError('week deve ser um número inteiro entre 1 e 12', 400);
      }
    }

    return this.repo.update(id, {
      type,
      week: weekNumber,
      observations,
      started_at: started_at ? new Date(started_at) : undefined,
      ended_at: ended_at ? new Date(ended_at) : undefined,
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
