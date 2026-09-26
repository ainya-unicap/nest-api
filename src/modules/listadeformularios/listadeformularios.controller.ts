import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import type { Request } from 'express';
import { Req } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { ListaDeFormulariosService } from '../../services/listadeformularios.service';
import { DossieService } from '../../services/dossie.service';
import { ApiAuth, errorSchema } from '../../swagger/decorators';

const listaSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    canteiro_id: { type: 'string', format: 'uuid' },
    plant_id: { type: 'string', format: 'uuid' },
    created_by: { type: 'string', format: 'uuid' },
    name: { type: 'string', nullable: true, example: 'Acompanhamento semanal 2026.1' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// legacy router is mounted as /listas-formularios
@ApiTags('ListasFormularios')
@ApiAuth()
@Controller('listas-formularios')
export class ListaDeFormulariosController {
  constructor(
    private readonly listaDeFormulariosService: ListaDeFormulariosService,
    private readonly dossieService: DossieService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma lista de formulários para um canteiro' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['canteiro_id', 'plant_id', 'created_by'],
      properties: {
        canteiro_id: { type: 'string', format: 'uuid' },
        plant_id: { type: 'string', format: 'uuid' },
        created_by: { type: 'string', format: 'uuid', description: 'id do usuário criador' },
        name: { type: 'string', example: 'Acompanhamento semanal 2026.1' },
      },
    },
  })
  @ApiCreatedResponse({ schema: listaSchema })
  async create(@Body() body: any) {
    return this.listaDeFormulariosService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma lista' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: listaSchema })
  async findById(@Param('id') id: string) {
    return this.listaDeFormulariosService.findById(id);
  }

  @Get('canteiro/:canteiroId')
  @ApiOperation({ summary: 'Lista as listas de um canteiro' })
  @ApiParam({ name: 'canteiroId', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: listaSchema } })
  async findByCanteiro(@Param('canteiroId') canteiroId: string) {
    return this.listaDeFormulariosService.findByCanteiro(canteiroId);
  }

  @Get(':id/formularios')
  @ApiOperation({ summary: 'Lista os formulários preenchidos dentro da lista' })
  @ApiParam({ name: 'id', description: 'id da lista', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async findFormularios(@Param('id') id: string) {
    return this.listaDeFormulariosService.findFormularios(id);
  }

  // Consolidado que alimenta o resumo por IA. Números já agregados aqui de
  // propósito: o modelo escreve o texto, não faz a conta.
  @Get(':id/dossie')
  @ApiOperation({
    summary: 'Dossiê consolidado da lista (entrada do resumo por IA)',
    description:
      'Reúne planta, período, métricas agregadas (com série temporal), checklist e observações ' +
      'de todos os formulários da lista. Exige que o usuário esteja vinculado ao canteiro.',
  })
  @ApiParam({ name: 'id', description: 'id da lista', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'object' } })
  @ApiForbiddenResponse({ schema: errorSchema('Usuário não está vinculado ao canteiro desta lista') })
  @ApiNotFoundResponse({ schema: errorSchema('Lista de formulários não encontrada') })
  @ApiUnprocessableEntityResponse({ schema: errorSchema('A lista ainda não tem formulários preenchidos') })
  async dossie(@Param('id') id: string, @Req() req: Request) {
    return await this.dossieService.montar(id, req.user?.id ?? '');
  }
}
