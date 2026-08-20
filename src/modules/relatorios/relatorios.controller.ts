import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

import { RelatorioService } from '../../services/relatorio.service';
import { ApiAuth, errorSchema } from '../../swagger/decorators';

type SecaoRelatorio =
  | 'introduction'
  | 'objective'
  | 'development'
  | 'final_thoughts'
  | 'references';

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
    grade: { type: 'number', example: 0 },
    feedback: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    submittedAt: { type: 'string', format: 'date-time' },
  },
};

// O userId é resolvido do body ou do token; documentamos como opcional no corpo.
const secaoBody = (secao: string) => ({
  schema: {
    type: 'object' as const,
    required: [secao],
    properties: {
      [secao]: { type: 'string' as const, example: 'Texto da seção...' },
      userId: {
        type: 'string' as const,
        format: 'uuid',
        description: 'Opcional — se omitido, usa o id do token',
      },
    },
  },
});

@ApiTags('Relatorios')
@ApiAuth()
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatorioService: RelatorioService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lista os relatórios de um usuário' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: relatorioSchema } })
  async getRelatoriosByUser(@Param('userId') userId: string) {
    return await this.relatorioService.getRelatoriosByUser(userId);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Gera um relatório a partir de uma lista de formulários',
    description: 'O relatório nasce com status RASCUNHO.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['list_id'],
      properties: {
        list_id: { type: 'string', format: 'uuid' },
        listId: { type: 'string', format: 'uuid', description: 'Alias de list_id' },
        userId: {
          type: 'string',
          format: 'uuid',
          description: 'Opcional — se omitido, usa o id do token',
        },
      },
    },
  })
  @ApiCreatedResponse({ schema: relatorioSchema })
  @ApiBadRequestResponse({ schema: errorSchema('listId/list_id é obrigatório') })
  async generate(@Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    const listId = body?.listId ?? body?.list_id;

    if (!listId) {
      throw new BadRequestException('listId/list_id é obrigatório');
    }

    return await this.relatorioService.createRelatorio(userId, listId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um relatório' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: relatorioSchema })
  @ApiNotFoundResponse({ schema: errorSchema('Relatório não encontrado.') })
  async getRelatorioById(@Param('id') id: string) {
    return await this.relatorioService.getRelatorioById(id);
  }

  @Put(':id/objective')
  @ApiOperation({ summary: 'Atualiza o objetivo (salvamento automático)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(secaoBody('objective'))
  @ApiOkResponse({ schema: relatorioSchema })
  @ApiBadRequestResponse({ schema: errorSchema('objective é obrigatório') })
  async updateObjective(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    const novoObjetivo = body?.objective ?? body?.novoObjetivo ?? body?.objetivo;

    if (novoObjetivo === undefined) {
      throw new BadRequestException('objective é obrigatório');
    }

    return await this.relatorioService.updateObjective(id, userId, String(novoObjetivo));
  }

  @Put(':id/introduction')
  @ApiOperation({ summary: 'Atualiza a introdução' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(secaoBody('introduction'))
  @ApiOkResponse({ schema: relatorioSchema })
  async updateIntroduction(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    return this.updateSection(id, 'introduction', body, req);
  }

  @Put(':id/development')
  @ApiOperation({ summary: 'Atualiza o desenvolvimento' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(secaoBody('development'))
  @ApiOkResponse({ schema: relatorioSchema })
  async updateDevelopment(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    return this.updateSection(id, 'development', body, req);
  }

  @Put(':id/final-thoughts')
  @ApiOperation({ summary: 'Atualiza as considerações finais' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(secaoBody('final_thoughts'))
  @ApiOkResponse({ schema: relatorioSchema })
  async updateFinalThoughts(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    return this.updateSection(id, 'final_thoughts', body, req);
  }

  @Put(':id/references')
  @ApiOperation({ summary: 'Atualiza as referências' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(secaoBody('references'))
  @ApiOkResponse({ schema: relatorioSchema })
  async updateReferences(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    return this.updateSection(id, 'references', body, req);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza várias seções de uma vez' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        introduction: { type: 'string' },
        objective: { type: 'string' },
        development: { type: 'string' },
        final_thoughts: { type: 'string' },
        references: { type: 'string' },
        userId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOkResponse({ schema: relatorioSchema })
  async update(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    return await this.relatorioService.update(id, userId, body);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submete o relatório',
    description: 'Muda o status para SUBMETIDO e carimba submittedAt.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    required: false,
    schema: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } } },
  })
  @ApiCreatedResponse({ schema: relatorioSchema })
  async submit(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    return await this.relatorioService.submit(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um relatório' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    required: false,
    schema: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } } },
  })
  @ApiOkResponse({ schema: relatorioSchema })
  async delete(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    return await this.relatorioService.delete(id, userId);
  }

  @Get(':id/export-pdf')
  @ApiOperation({
    summary: 'Exporta o relatório em PDF',
    description: 'Devolve o arquivo como anexo (relatorio-<id>.pdf).',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Arquivo PDF',
    schema: { type: 'string', format: 'binary' },
  })
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const relatorio: any = await this.relatorioService.getRelatorioById(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${id}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const planta = relatorio.list?.plant?.name ?? '—';
    const canteiro = relatorio.canteiro?.name ?? '—';

    doc.fontSize(18).text('Relatório', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`ID: ${relatorio.id}`);
    doc.text(`Status: ${relatorio.status}`);
    doc.text(`Planta: ${planta}`);
    doc.text(`Canteiro: ${canteiro}`);
    doc.text(`Gerado em: ${new Date(relatorio.createdAt).toLocaleString('pt-BR')}`);
    doc.moveDown();

    const secoes: Array<{ titulo: string; campo: string }> = [
      { titulo: 'Introdução', campo: 'introduction' },
      { titulo: 'Objetivo', campo: 'objective' },
      { titulo: 'Desenvolvimento', campo: 'development' },
      { titulo: 'Considerações Finais', campo: 'final_thoughts' },
      { titulo: 'Referências', campo: 'references' },
    ];

    for (const { titulo, campo } of secoes) {
      doc.fontSize(14).text(titulo, { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).text(String(relatorio[campo] ?? '(vazio)'), { align: 'justify' });
      doc.moveDown();
    }

    doc.end();
    return;
  }

  private async updateSection(
    id: string,
    secao: SecaoRelatorio,
    body: any,
    req?: Request,
  ) {
    const userId = this.resolveUserId(body, req);
    const valor =
      body?.[secao] ??
      body?.[secao.replace(/_/g, '')] ??
      body?.[secao.replace(/_/g, '-')];

    if (valor === undefined) {
      throw new BadRequestException(`${secao} é obrigatório`);
    }

    return await this.relatorioService.updateSection(id, userId, secao, String(valor));
  }

  private resolveUserId(body: any, req?: Request): string {
    const userId = body?.userId ?? body?.user_id ?? (req as any)?.user?.id;

    if (!userId) {
      throw new BadRequestException('userId é obrigatório');
    }

    return userId;
  }
}
