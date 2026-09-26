import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiAcceptedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { ResumoIaService } from '../../services/resumoia.service';
import { ApiAuth, errorSchema } from '../../swagger/decorators';

const resumoSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    list_id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['PENDENTE', 'PROCESSANDO', 'PRONTO', 'ERRO'] },
    secoes: {
      type: 'object',
      nullable: true,
      properties: {
        introducao: { type: 'string' },
        desenvolvimento: { type: 'string' },
        cuidados: { type: 'string' },
        conclusao: { type: 'string' },
      },
    },
    modelo: { type: 'string', nullable: true, example: 'llama-3.3-70b-versatile' },
    prompt_versao: { type: 'string', nullable: true, example: '1.0.0' },
    tokens_entrada: { type: 'integer', nullable: true },
    tokens_saida: { type: 'integer', nullable: true },
    duracao_ms: { type: 'integer', nullable: true },
    erro: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    concluidoEm: { type: 'string', format: 'date-time', nullable: true },
  },
};

@ApiTags('ResumoIA')
@ApiAuth()
@Controller()
export class ResumoIaController {
  constructor(private readonly resumoIaService: ResumoIaService) {}

  @Post('listas-formularios/:id/resumo-ia')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Solicita a geração do resumo por IA (assíncrono)',
    description:
      'Monta o dossiê, grava o pedido como PENDENTE e retorna 202 na hora. A chamada ao ' +
      'modelo roda em segundo plano — consulte GET /resumo-ia/{id} até o status virar ' +
      'PRONTO ou ERRO. É assíncrono porque a Vercel Hobby corta a requisição em 10s.',
  })
  @ApiParam({ name: 'id', description: 'id da lista de formulários' })
  @ApiAcceptedResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', example: 'PENDENTE' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiForbiddenResponse({ schema: errorSchema('Usuário não está vinculado ao canteiro desta lista') })
  @ApiNotFoundResponse({ schema: errorSchema('Lista de formulários não encontrada') })
  @ApiUnprocessableEntityResponse({ schema: errorSchema('A lista ainda não tem formulários preenchidos') })
  async solicitar(@Param('id') id: string, @Req() req: Request) {
    return await this.resumoIaService.solicitar(id, req.user?.id ?? '');
  }

  @Get('listas-formularios/:id/resumo-ia')
  @ApiOperation({
    summary: 'Histórico de resumos gerados para a lista',
    description: 'Sem o dossiê e sem as seções — use GET /resumo-ia/{id} para o conteúdo.',
  })
  @ApiParam({ name: 'id', description: 'id da lista de formulários' })
  @ApiOkResponse({ schema: { type: 'array', items: resumoSchema } })
  async listar(@Param('id') id: string, @Req() req: Request) {
    return await this.resumoIaService.listarPorLista(id, req.user?.id ?? '');
  }

  @Get('resumo-ia/:id')
  @ApiOperation({
    summary: 'Consulta o resumo (é aqui que o front faz o polling)',
    description:
      'PENDENTE/PROCESSANDO: ainda gerando. PRONTO: `secoes` preenchido. ERRO: `erro` explica o motivo.',
  })
  @ApiParam({ name: 'id', description: 'id do resumo' })
  @ApiOkResponse({ schema: resumoSchema })
  @ApiNotFoundResponse({ schema: errorSchema('Resumo não encontrado') })
  async consultar(@Param('id') id: string, @Req() req: Request) {
    return await this.resumoIaService.consultar(id, req.user?.id ?? '');
  }

  @Post('resumo-ia/:id/reprocessar')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Tenta de novo um resumo que falhou ou travou',
    description: 'Serve para status ERRO e para o caso de o processo ter morrido em PROCESSANDO.',
  })
  @ApiParam({ name: 'id', description: 'id do resumo' })
  @ApiAcceptedResponse({ schema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' } } } })
  async reprocessar(@Param('id') id: string, @Req() req: Request) {
    return await this.resumoIaService.reprocessar(id, req.user?.id ?? '');
  }
}
