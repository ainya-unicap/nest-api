import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { FormularioService } from '../../services/formulario.service';
import { ChecklistService } from '../../services/checklist.service';
import { MeasurementService } from '../../services/measurement.service';
import { ApiAuth, erroDeValidacaoSchema, errorSchema } from '../../swagger/decorators';

const formularioSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    list_id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    type: { type: 'string', enum: ['SEMANAL', 'DIARIO'] },
    week: { type: 'integer', nullable: true, minimum: 1, maximum: 12, example: 3 },
    started_at: { type: 'string', format: 'date-time' },
    ended_at: { type: 'string', format: 'date-time' },
    observations: { type: 'string' },
    synced: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const updateBody = {
  schema: {
    type: 'object' as const,
    properties: {
      type: { type: 'string' as const, enum: ['SEMANAL', 'DIARIO'] },
      week: { type: 'integer' as const, minimum: 1, maximum: 12, example: 3 },
      observations: { type: 'string' as const },
      started_at: { type: 'string' as const, format: 'date-time' },
      ended_at: { type: 'string' as const, format: 'date-time' },
      synced: { type: 'boolean' as const },
    },
  },
};

@ApiTags('Formularios')
@ApiAuth()
@Controller('formularios')
export class FormulariosController {
  constructor(
    private readonly formularioService: FormularioService,
    private readonly checklistService: ChecklistService,
    private readonly measurementService: MeasurementService,
  ) {}

  // Aliases de mesmo verbo vao no mesmo decorator; empilhar @Get duas vezes
  // sobrescreve a metadata e so uma rota fica registrada.
  @Get(['', 'user/:userId'])
  @ApiOperation({
    summary: 'Lista os formulários de um usuário',
    description:
      'O id do usuário pode vir pelo path (/user/:userId), pela query (user_id ou userId) ou do próprio token.',
  })
  @ApiQuery({ name: 'user_id', required: false, type: String, description: 'uuid do usuário' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'alias de user_id' })
  @ApiOkResponse({ schema: { type: 'array', items: formularioSchema } })
  async findAllByUser(
    @Query('user_id') userIdQuery?: string,
    @Query('userId') userIdAltQuery?: string,
    @Param('userId') userIdParam?: string,
    @Req() req?: Request,
  ) {
    const userId = userIdParam ?? userIdQuery ?? userIdAltQuery ?? req?.user?.id;
    return await this.formularioService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalha um formulário',
    description: 'Inclui lista, planta, canteiro, checklist, medições e fotos.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: formularioSchema })
  @ApiNotFoundResponse({ schema: errorSchema('Formulário não encontrado') })
  async findById(@Param('id') id: string) {
    return await this.formularioService.findById(id);
  }

  @Get(':id/checklist')
  @ApiOperation({ summary: 'Itens de checklist do formulário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async getChecklist(@Param('id') id: string) {
    return await this.formularioService.getChecklist(id);
  }

  @Get(':id/measurements')
  @ApiOperation({ summary: 'Medições do formulário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async getMeasurements(@Param('id') id: string) {
    return await this.formularioService.getMeasurements(id);
  }

  @Get(':id/photos')
  @ApiOperation({ summary: 'Fotos do formulário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async getPhotos(@Param('id') id: string) {
    return await this.formularioService.getPhotos(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria um formulário',
    description:
      'started_at/ended_at são preenchidos com a hora atual quando omitidos. week é a ' +
      'semana do acompanhamento (1 a 12) escolhida pelo aluno.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['list_id', 'user_id', 'type'],
      properties: {
        list_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['SEMANAL', 'DIARIO'] },
        week: { type: 'integer', minimum: 1, maximum: 12, example: 3 },
        observations: { type: 'string', example: 'Chuva forte durante a coleta' },
      },
    },
  })
  @ApiCreatedResponse({ schema: formularioSchema })
  @ApiBadRequestResponse({
    description:
      'Validação: `campos` lista o problema de cada campo (todos de uma vez). ' +
      'Se um id enviado não existir no banco, o código é REFERENCIA_INEXISTENTE ' +
      'e `campos` nomeia qual (list_id ou user_id).',
    schema: erroDeValidacaoSchema(
      {
        user_id: 'obrigatório',
        type: 'deve ser SEMANAL ou DIARIO (recebido: "MENSAL")',
        week: 'deve ser um número inteiro entre 1 e 12 (recebido: 99)',
      },
      'FORMULARIO_INVALIDO',
    ),
  })
  async create(@Body() body: any) {
    return await this.formularioService.create(body);
  }

  @Post(':id/checklist')
  @ApiOperation({ summary: 'Cria em lote os itens de checklist do formulário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['template_ids'],
      properties: {
        template_ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'ids dos PlantTemplate que viram itens do checklist',
        },
      },
    },
  })
  @ApiCreatedResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async createChecklistForFormulario(@Param('id') id: string, @Body() body: any) {
    const { template_ids } = body;
    return await this.checklistService.createManyForFormulario(id, template_ids);
  }

  @Post(':id/measurements')
  @ApiOperation({ summary: 'Cria em lote as medições do formulário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['measurements'],
      properties: {
        measurements: {
          type: 'array',
          items: {
            type: 'object',
            required: ['template_id', 'value'],
            properties: {
              template_id: { type: 'string', format: 'uuid' },
              value: { type: 'number', example: 32.5 },
            },
          },
        },
      },
    },
  })
  @ApiCreatedResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async createMeasurementsForFormulario(@Param('id') id: string, @Body() body: any) {
    const { measurements } = body;
    return await this.measurementService.createManyForFormulario(id, measurements);
  }

  @Post(':id/finalizar')
  @ApiOperation({
    summary: 'Finaliza o formulário',
    description: 'Grava ended_at = agora e marca synced = true.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ schema: formularioSchema })
  async finalizar(@Param('id') id: string) {
    return await this.formularioService.finalizar(id);
  }

  // Verbos diferentes precisam de handlers separados.
  @Patch(':id/finalizar')
  @ApiOperation({ summary: 'Finaliza o formulário (alias PATCH)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: formularioSchema })
  async finalizarPatch(@Param('id') id: string) {
    return await this.formularioService.finalizar(id);
  }

  @Post(':id/sync')
  @ApiOperation({
    summary: 'Sincroniza o formulário preenchido offline',
    description:
      'Atualiza o formulário e insere checklist, medições e fotos numa única transação.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        formulario: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['SEMANAL', 'DIARIO'] },
            observations: { type: 'string' },
            started_at: { type: 'string', format: 'date-time' },
            ended_at: { type: 'string', format: 'date-time' },
          },
        },
        checklist: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              template_id: { type: 'string', format: 'uuid' },
              checked: { type: 'boolean' },
            },
          },
        },
        measurements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              template_id: { type: 'string', format: 'uuid' },
              value: { type: 'number' },
            },
          },
        },
        photos: {
          type: 'array',
          items: { type: 'object', properties: { url: { type: 'string' } } },
        },
      },
    },
  })
  @ApiCreatedResponse({ schema: formularioSchema })
  async sync(@Param('id') id: string, @Body() body: any) {
    return await this.formularioService.sync(id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza o formulário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(updateBody)
  @ApiOkResponse({ schema: formularioSchema })
  @ApiBadRequestResponse({
    schema: erroDeValidacaoSchema(
      { week: 'deve ser um número inteiro entre 1 e 12 (recebido: "abc")' },
      'FORMULARIO_INVALIDO',
    ),
  })
  @ApiNotFoundResponse({ schema: errorSchema('Registro não encontrado', 'NAO_ENCONTRADO') })
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.formularioService.update(id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza o formulário (alias PATCH)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(updateBody)
  @ApiOkResponse({ schema: formularioSchema })
  @ApiBadRequestResponse({
    schema: erroDeValidacaoSchema(
      { type: 'deve ser SEMANAL ou DIARIO (recebido: "ANUAL")' },
      'FORMULARIO_INVALIDO',
    ),
  })
  @ApiNotFoundResponse({ schema: errorSchema('Registro não encontrado', 'NAO_ENCONTRADO') })
  async updatePartial(@Param('id') id: string, @Body() body: any) {
    return await this.formularioService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove o formulário',
    description: 'Só o dono pode remover; checklist, medições e fotos vão junto.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: formularioSchema })
  @ApiForbiddenResponse({
    schema: errorSchema('Você só pode deletar os próprios formulários'),
  })
  @ApiNotFoundResponse({ schema: errorSchema('Formulário não encontrado') })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id;
    return await this.formularioService.delete(id, userId);
  }
}
