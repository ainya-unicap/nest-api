import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { InstitutionService } from '../../services/institution.service';
import { Public } from '../../core/auth/public.decorator';
import { ApiAuth, erroDeValidacaoSchema, errorSchema } from '../../swagger/decorators';

const institutionSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Universidade Federal Rural de Pernambuco' },
    abbreviation: { type: 'string', example: 'UFRPE', description: 'sigla da instituição' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Institutions')
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionService: InstitutionService) {}

  // Público: a tela de cadastro precisa listar as instituições antes do login.
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lista as instituições',
    description:
      'Rota pública — a tela de cadastro consome antes de existir token. Ordenada por nome, ' +
      'cada item com name e abbreviation (sigla).',
  })
  @ApiOkResponse({ schema: { type: 'array', items: institutionSchema } })
  async findAll() {
    return this.institutionService.findAll();
  }

  @Post()
  @ApiAuth()
  @ApiOperation({ summary: 'Cria uma instituição' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'abbreviation'],
      properties: {
        name: { type: 'string', example: 'Universidade Federal Rural de Pernambuco', minLength: 2 },
        abbreviation: { type: 'string', example: 'UFRPE', description: 'sigla; não pode repetir' },
      },
    },
  })
  @ApiCreatedResponse({ schema: institutionSchema })
  @ApiBadRequestResponse({
    schema: erroDeValidacaoSchema(
      { name: 'obrigatório, mínimo 2 caracteres', abbreviation: 'obrigatório (sigla, ex.: UFRPE)' },
      'INSTITUICAO_INVALIDA',
    ),
  })
  async create(@Body() body: any) {
    return this.institutionService.create(body);
  }

  @Get(':id')
  @ApiAuth()
  @ApiOperation({ summary: 'Detalha uma instituição' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: institutionSchema })
  @ApiNotFoundResponse({ schema: errorSchema('Instituição não encontrada') })
  async findById(@Param('id') id: string) {
    return this.institutionService.findById(id);
  }
}
