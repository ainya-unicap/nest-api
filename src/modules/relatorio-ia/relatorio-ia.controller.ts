import { Controller, Post, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { RelatorioIaService } from '../../services/relatorioia.service';
import { HttpError } from '../../core/httpError';
import { ApiAuth, errorSchema } from '../../swagger/decorators';

const relatorioSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    canteiro_id: { type: 'string', format: 'uuid' },
    list_id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['RASCUNHO', 'SUBMETIDO', 'CORRIGIDO'] },
    introduction: { type: 'string' },
    objective: { type: 'string' },
    development: { type: 'string' },
    final_thoughts: { type: 'string' },
    references: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('RelatorioIA')
@ApiAuth()
@Controller()
export class RelatorioIaController {
  constructor(private readonly relatorioIaService: RelatorioIaService) {}

  // POST /canteiros/:id/relatorio-ia
  @Post('canteiros/:id/relatorio-ia')
  @ApiOperation({
    summary: 'Gera o relatório do canteiro com IA (Eliza)',
    description:
      'Chama o serviço de IA (Eliza, em outro deploy), repassando o token da sessão, e ' +
      'grava as 4 seções (introdução, objetivo, desenvolvimento, considerações finais) ' +
      'num Relatorio novo, em RASCUNHO. Exclusivo de quem está vinculado ao canteiro.',
  })
  @ApiParam({ name: 'id', description: 'id do canteiro', format: 'uuid' })
  @ApiOkResponse({ schema: relatorioSchema })
  @ApiUnauthorizedResponse({ schema: errorSchema('Token não enviado') })
  @ApiForbiddenResponse({ schema: errorSchema('Usuário não está vinculado a este canteiro') })
  @ApiNotFoundResponse({ schema: errorSchema('Canteiro não encontrado') })
  @ApiUnprocessableEntityResponse({ schema: errorSchema('O canteiro ainda não tem formulários preenchidos') })
  async gerar(@Param('id') id: string, @Req() req: Request) {
    const header = req.headers.authorization ?? '';
    const accessToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!accessToken) throw new HttpError('Token não enviado', 401);

    return this.relatorioIaService.gerar(id, req.user?.id ?? '', accessToken);
  }
}
