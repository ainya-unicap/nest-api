import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { PlantaForrageiraService } from '../../services/plantaforrageira.service';
import { ApiAuth, erroDeValidacaoSchema, errorSchema } from '../../swagger/decorators';

const CATEGORIAS = [
  'GRAMINEA_PORTE_BAIXO',
  'GRAMINEA_PORTE_MEDIO',
  'GRAMINEA_PORTE_ALTO',
  'LEGUMINOSA_ARBUSTIVA',
  'LEGUMINOSA_HERBACEA',
  'CACTACEA',
  'CULTURA_ANUAL',
  'OLEAGINOSA_FORRAGEIRA',
];

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

  @Post()
  @ApiOperation({ summary: 'Cadastra uma nova planta forrageira no catálogo' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'category', 'description', 'semester_focus'],
      properties: {
        name: { type: 'string', example: 'BRS Piatã' },
        category: { type: 'string', enum: CATEGORIAS },
        description: { type: 'string', example: 'Urochloa brizantha cv. BRS Piatã...' },
        semester_focus: { type: 'string', enum: ['PRIMEIRO', 'SEGUNDO', 'AMBOS'] },
      },
    },
  })
  @ApiCreatedResponse({ schema: plantaSchema })
  @ApiBadRequestResponse({
    schema: erroDeValidacaoSchema(
      { name: 'obrigatório, mínimo 2 caracteres', category: 'obrigatório', description: 'obrigatório', semester_focus: 'obrigatório' },
      'PLANTA_INVALIDA',
    ),
  })
  async create(@Body() body: any) {
    return this.plantaForrageiraService.create(body);
  }

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
