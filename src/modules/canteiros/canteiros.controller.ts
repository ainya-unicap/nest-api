import { Controller, Delete, Get, Post, Param, Body, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
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

import { CanteiroService } from '../../services/canteiro.service';
import { ApiAuth, erroDeValidacaoSchema, errorSchema } from '../../swagger/decorators';

const canteiroSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Canteiro A1' },
    plant_id: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// Resposta do POST: além do canteiro, já vem a planta e a lista criada junto
// na mesma transação — poupa o app de 2 chamadas a mais.
const canteiroCriadoSchema = {
  type: 'object' as const,
  properties: {
    ...canteiroSchema.properties,
    plant: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'BRS Piatã' },
        category: { type: 'string', example: 'GRAMINEA_PORTE_MEDIO' },
      },
    },
    listaDeFormularios: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', nullable: true, example: 'Canteiro A1' },
        },
      },
    },
  },
};

@ApiTags('Canteiros')
@ApiAuth()
@Controller('canteiros')
export class CanteirosController {
  constructor(private readonly canteiroService: CanteiroService) {}

  // GET /canteiros?userId=...
  @Get()
  @ApiOperation({
    summary: 'Lista os canteiros de um usuário',
    description: 'Sem o parâmetro userId a resposta é uma lista vazia.',
  })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'uuid do usuário' })
  @ApiOkResponse({ schema: { type: 'array', items: canteiroSchema } })
  async findAll(@Query('userId') userId?: string): Promise<any> {
    if (userId) {
      return this.canteiroService.findByUser(userId);
    }
    // fallback: no userId provided — return empty list
    return [];
  }

  // POST /canteiros
  @Post()
  @ApiOperation({
    summary: 'Cria um canteiro, já com o vínculo e a lista de formulários',
    description:
      'Numa única transação: cria o canteiro, vincula o usuário do token a ele e cria a ' +
      'lista de formulários (plant_id herdado do canteiro). Se qualquer passo falhar, nada ' +
      'é gravado. user_id/created_by enviados no corpo são ignorados — o dono é sempre ' +
      'quem está autenticado.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'plant_id'],
      properties: {
        name: { type: 'string', example: 'Canteiro A1', minLength: 2 },
        plant_id: {
          type: 'string',
          format: 'uuid',
          description: 'id da planta forrageira cultivada',
        },
        list_name: {
          type: 'string',
          example: 'Acompanhamento semanal 2026.1',
          description: 'Nome da lista de formulários criada junto. Padrão: o mesmo valor de name.',
        },
      },
    },
  })
  @ApiCreatedResponse({ schema: canteiroCriadoSchema })
  @ApiBadRequestResponse({
    schema: erroDeValidacaoSchema(
      { name: 'obrigatório, mínimo 2 caracteres', plant_id: 'obrigatório' },
      'CANTEIRO_INVALIDO',
    ),
  })
  @ApiNotFoundResponse({ schema: errorSchema('Planta não encontrada') })
  async create(@Body() body: any, @Req() req: Request): Promise<any> {
    return this.canteiroService.create(body, req.user?.id ?? '');
  }

  // GET /canteiros/:id/listas
  @Get(':id/listas')
  @ApiOperation({ summary: 'Lista as listas de formulários de um canteiro' })
  @ApiParam({ name: 'id', description: 'id do canteiro', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async findListasByCanteiro(@Param('id') id: string): Promise<any> {
    return this.canteiroService.findListasByCanteiro(id);
  }

  // GET /canteiros/:id/formularios
  @Get(':id/formularios')
  @ApiOperation({
    summary: 'Todos os formulários do canteiro, organizados por lista',
    description:
      'Leitura direta do banco (sem IA). Cada lista vem com seus formulários completos ' +
      '(campos fixos + fotos). Exclusivo de quem está vinculado ao canteiro.',
  })
  @ApiParam({ name: 'id', description: 'id do canteiro', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  @ApiForbiddenResponse({ schema: errorSchema('Usuário não está vinculado a este canteiro') })
  @ApiNotFoundResponse({ schema: errorSchema('Canteiro não encontrado') })
  async findFormulariosByCanteiro(@Param('id') id: string, @Req() req: Request): Promise<any> {
    return this.canteiroService.findFormulariosByCanteiro(id, req.user?.id ?? '');
  }

  // DELETE /canteiros/:id
  @Delete(':id')
  @ApiOperation({
    summary: 'Remove o vínculo do usuário com o canteiro, ou exclui o canteiro',
    description:
      'Se houver outro usuário vinculado ao canteiro, apenas remove o vínculo de quem está ' +
      'autenticado (o canteiro continua existindo). Se o usuário do token for o único ' +
      'vinculado, exclui o canteiro inteiro (listas, formulários, fotos e relatórios em ' +
      'RASCUNHO) — a menos que exista relatório SUBMETIDO ou CORRIGIDO, que bloqueia a ' +
      'exclusão por ser histórico acadêmico.',
  })
  @ApiParam({ name: 'id', description: 'id do canteiro', format: 'uuid' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Canteiro excluído com sucesso' },
        removido: { type: 'string', enum: ['vinculo', 'canteiro'] },
      },
    },
  })
  @ApiBadRequestResponse({
    schema: errorSchema(
      'Não é possível excluir: o canteiro tem relatório submetido ou corrigido',
      'CANTEIRO_COM_RELATORIO_FECHADO',
    ),
  })
  @ApiForbiddenResponse({ schema: errorSchema('Usuário não está vinculado a este canteiro') })
  @ApiNotFoundResponse({ schema: errorSchema('Canteiro não encontrado') })
  async delete(@Param('id') id: string, @Req() req: Request): Promise<any> {
    return this.canteiroService.deleteCanteiro(id, req.user?.id ?? '');
  }

  // GET /canteiros/user/:userId
  @Get('user/:userId')
  @ApiOperation({ summary: 'Lista os canteiros vinculados a um usuário' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: canteiroSchema } })
  async findByUser(@Param('userId') userId: string): Promise<any> {
    return this.canteiroService.findByUser(userId);
  }
}
