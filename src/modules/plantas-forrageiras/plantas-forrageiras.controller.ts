import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { PlantaForrageiraService } from '../../services/plantaforrageira.service';
import { ApiAuth, errorSchema } from '../../swagger/decorators';

const plantaSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'BRS Piatã' },
    category: {
      type: 'string',
      example: 'GRAMINEA_PORTE_MEDIO',
      description: 'GRAMINEA_PORTE_BAIXO | GRAMINEA_PORTE_MEDIO | GRAMINEA_PORTE_ALTO | LEGUMINOSA_ARBUSTIVA | LEGUMINOSA_HERBACEA | CACTACEA | CULTURA_ANUAL | OLEAGINOSA_FORRAGEIRA',
    },
    description: { type: 'string', example: 'Urochloa brizantha cv. BRS Piatã...' },
    semester_focus: { type: 'string', enum: ['PRIMEIRO', 'SEGUNDO', 'AMBOS'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('PlantasForrageiras')
@ApiAuth()
@Controller('plantas-forrageiras')
export class PlantasForrageirasController {
  constructor(private readonly plantaForrageiraService: PlantaForrageiraService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista o catálogo de plantas forrageiras',
    description: 'Ordenado por nome. Planta com semester_focus=AMBOS entra nos dois filtros de semestre.',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filtra pela categoria exata' })
  @ApiQuery({ name: 'semester_focus', required: false, enum: ['PRIMEIRO', 'SEGUNDO'] })
  @ApiOkResponse({ schema: { type: 'array', items: plantaSchema } })
  async findAll(
    @Query('category') category?: string,
    @Query('semester_focus') semesterFocus?: string,
  ) {
    return this.plantaForrageiraService.findAll(category, semesterFocus);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma planta forrageira' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: plantaSchema })
  @ApiNotFoundResponse({ schema: errorSchema('Planta forrageira não encontrada') })
  async findById(@Param('id') id: string) {
    return this.plantaForrageiraService.findById(id);
  }
}
