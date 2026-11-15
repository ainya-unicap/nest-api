import { Injectable } from '@nestjs/common';
import { PlantaForrageiraRepository } from '../repositories/plantaforrageira.repository';
import { HttpError, erroDeCampos } from '../core/httpError';

const SEMESTRES_VALIDOS = ['PRIMEIRO', 'SEGUNDO'];
const SEMESTRES_FOCO_VALIDOS = ['PRIMEIRO', 'SEGUNDO', 'AMBOS'];
const CATEGORIAS_VALIDAS = [
  'GRAMINEA_PORTE_BAIXO',
  'GRAMINEA_PORTE_MEDIO',
  'GRAMINEA_PORTE_ALTO',
  'LEGUMINOSA_ARBUSTIVA',
  'LEGUMINOSA_HERBACEA',
  'CACTACEA',
  'CULTURA_ANUAL',
  'OLEAGINOSA_FORRAGEIRA',
];

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

  async create(body: any) {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const category = typeof body?.category === 'string' ? body.category.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const semesterFocus = typeof body?.semester_focus === 'string' ? body.semester_focus.trim() : '';

    const campos: Record<string, string> = {};
    if (!name || name.length < 2) campos.name = 'obrigatório, mínimo 2 caracteres';
    if (!category) campos.category = 'obrigatório';
    else if (!CATEGORIAS_VALIDAS.includes(category)) {
      campos.category = `deve ser uma de: ${CATEGORIAS_VALIDAS.join(', ')}`;
    }
    if (!description) campos.description = 'obrigatório';
    if (!semesterFocus) campos.semester_focus = 'obrigatório';
    else if (!SEMESTRES_FOCO_VALIDOS.includes(semesterFocus)) {
      campos.semester_focus = `deve ser uma de: ${SEMESTRES_FOCO_VALIDOS.join(', ')}`;
    }

    if (Object.keys(campos).length > 0) throw erroDeCampos(campos, 'PLANTA_INVALIDA');

    return this.repo.create({ name, category, description, semester_focus: semesterFocus });
  }
}
