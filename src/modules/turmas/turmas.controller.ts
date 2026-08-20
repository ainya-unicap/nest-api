import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { TurmaService } from '../../services/turma.service';
import { ApiAuth } from '../../swagger/decorators';

const turmaSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Agronomia 2026.1 - Turma A' },
    institution_id: { type: 'string', format: 'uuid', nullable: true },
    period_id: { type: 'string', format: 'uuid' },
    created_by: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Turmas')
@ApiAuth()
@Controller('turmas')
export class TurmasController {
  constructor(private readonly turmaService: TurmaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as turmas' })
  @ApiOkResponse({ schema: { type: 'array', items: turmaSchema } })
  async findAll() {
    return await this.turmaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma turma' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: turmaSchema })
  async findById(@Param('id') id: string) {
    return await this.turmaService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma turma' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'period_id', 'created_by'],
      properties: {
        name: { type: 'string', example: 'Agronomia 2026.1 - Turma A' },
        period_id: { type: 'string', format: 'uuid', description: 'id do período letivo' },
        created_by: { type: 'string', format: 'uuid', description: 'id do professor criador' },
        institution_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiCreatedResponse({ schema: turmaSchema })
  async create(@Body() body: any) {
    return await this.turmaService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza uma turma' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        period_id: { type: 'string', format: 'uuid' },
        institution_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOkResponse({ schema: turmaSchema })
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.turmaService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma turma' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: turmaSchema })
  async delete(@Param('id') id: string) {
    return await this.turmaService.delete(id);
  }
}
