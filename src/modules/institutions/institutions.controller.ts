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
import { ApiAuth, errorSchema } from '../../swagger/decorators';

const institutionSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Universidade Catolica de Pernambuco' },
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
    description: 'Rota pública — a tela de cadastro consome antes de existir token.',
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
      required: ['name'],
      properties: { name: { type: 'string', example: 'Universidade Catolica de Pernambuco' } },
    },
  })
  @ApiCreatedResponse({ schema: institutionSchema })
  @ApiBadRequestResponse({ schema: errorSchema('Name is required') })
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
