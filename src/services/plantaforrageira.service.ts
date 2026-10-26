import { Injectable } from '@nestjs/common';
import { PlantaForrageiraRepository } from '../repositories/plantaforrageira.repository';
import { HttpError } from '../core/httpError';

const SEMESTRES_VALIDOS = ['PRIMEIRO', 'SEGUNDO'];

@Injectable()
export class PlantaForrageiraService {
  private repo = new PlantaForrageiraRepository();

  findAll(category?: string, semester_focus?: string) {
    if (semester_focus && !SEMESTRES_VALIDOS.includes(semester_focus)) {
      throw new HttpError(`semester_focus deve ser ${SEMESTRES_VALIDOS.join(' ou ')}`, 400);
    }

    return this.repo.findAll({ category, semester_focus });
  }

  async findById(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    const planta = await this.repo.findById(id);
    if (!planta) throw new HttpError('Planta forrageira não encontrada', 404);

    return planta;
  }
}
