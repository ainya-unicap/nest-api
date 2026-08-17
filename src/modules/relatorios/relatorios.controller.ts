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
import { RelatorioService } from '../../services/relatorio.service';

type SecaoRelatorio =
  | 'introduction'
  | 'objective'
  | 'development'
  | 'final_thoughts'
  | 'references';

@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatorioService: RelatorioService) {}

  @Get('user/:userId')
  async getRelatoriosByUser(@Param('userId') userId: string) {
    return await this.relatorioService.getRelatoriosByUser(userId);
  }

  @Post('generate')
  async generate(@Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    const listId = body?.listId ?? body?.list_id;

    if (!listId) {
      throw new BadRequestException('listId/list_id é obrigatório');
    }

    return await this.relatorioService.createRelatorio(userId, listId);
  }

  @Get(':id')
  async getRelatorioById(@Param('id') id: string) {
    return await this.relatorioService.getRelatorioById(id);
  }

  @Put(':id/objective')
  async updateObjective(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    const novoObjetivo = body?.objective ?? body?.novoObjetivo ?? body?.objetivo;

    if (novoObjetivo === undefined) {
      throw new BadRequestException('objective é obrigatório');
    }

    return await this.relatorioService.updateObjective(id, userId, String(novoObjetivo));
  }

  @Put(':id/introduction')
  async updateIntroduction(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    return this.updateSection(id, 'introduction', body, req);
  }

  @Put(':id/development')
  async updateDevelopment(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    return this.updateSection(id, 'development', body, req);
  }

  @Put(':id/final-thoughts')
  async updateFinalThoughts(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    return this.updateSection(id, 'final_thoughts', body, req);
  }

  @Put(':id/references')
  async updateReferences(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    return this.updateSection(id, 'references', body, req);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    return await this.relatorioService.update(id, userId, body);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    return await this.relatorioService.submit(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() body: any, @Req() req?: Request) {
    const userId = this.resolveUserId(body, req);
    return await this.relatorioService.delete(id, userId);
  }

  @Get(':id/export-pdf')
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const relatorio = await this.relatorioService.getRelatorioById(id);
    const pdfkitModule = await import('pdfkit');
    const PDFDocument = pdfkitModule.default ?? pdfkitModule;

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
