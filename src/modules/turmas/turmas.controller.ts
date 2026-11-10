import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { TurmaService } from '../../services/turma.service';
import { ApiAuth, errorSchema } from '../../swagger/decorators';
import { uploadPdfOptions } from '../../core/upload.config';

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

// Lado do aluno. Criação de turma e gestão de código viraram exclusivas da
// professora — ver módulo "professores".
@ApiTags('Turmas')
@ApiAuth()
@Controller('turmas')
export class TurmasController {
  constructor(private readonly turmaService: TurmaService) {}

  // GET /turmas/minhas
  @Get('minhas')
  @ApiOperation({ summary: 'Lista as turmas em que o aluno logado está vinculado' })
  @ApiOkResponse({ schema: { type: 'array', items: turmaSchema } })
  async minhasTurmas(@Req() req: Request) {
    return await this.turmaService.minhasTurmas(req.user?.id ?? '');
  }

  // POST /turmas/entrar
  @Post('entrar')
  @ApiOperation({
    summary: 'Entra numa turma usando o código repassado pela professora',
    description: 'Igual a entrar numa chamada por código: o aluno nunca escolhe o id da turma.',
  })
  @ApiBody({
    schema: { type: 'object', required: ['code'], properties: { code: { type: 'string', example: 'A3F9K2' } } },
  })
  @ApiCreatedResponse({ schema: turmaSchema })
  @ApiNotFoundResponse({ schema: errorSchema('Código inválido', 'CODIGO_INVALIDO') })
  @ApiConflictResponse({ schema: errorSchema('Você já está vinculado a esta turma', 'JA_VINCULADO') })
  async entrar(@Body('code') code: string, @Req() req: Request) {
    return await this.turmaService.entrarComCodigo(req.user?.id ?? '', code);
  }

  // POST /turmas/:id/relatorios
  @Post(':id/relatorios')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', uploadPdfOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Entrega um relatório (PDF) pra turma',
    description:
      'O PDF pode ser de qualquer origem, sem relação com os dados do app (canteiro, ' +
      'formulário etc). Só PDF, no máximo 10 páginas. Reenviar pra mesma turma substitui a ' +
      'entrega anterior (arquivo velho é removido). Sem nota/feedback por enquanto.',
  })
  @ApiParam({ name: 'id', description: 'id da turma', format: 'uuid' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        fileUrl: { type: 'string' },
        fileName: { type: 'string' },
        submittedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Arquivo ausente/inválido, ou PDF_MUITAS_PAGINAS (mais de 10 páginas).',
    schema: errorSchema('O PDF tem 14 páginas; o máximo permitido é 10', 'PDF_MUITAS_PAGINAS'),
  })
  @ApiForbiddenResponse({ schema: errorSchema('Você não está vinculado a esta turma', 'TURMA_NAO_VINCULADA') })
  @ApiNotFoundResponse({ schema: errorSchema('Turma não encontrada') })
  async enviarRelatorio(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return await this.turmaService.enviarRelatorio(req.user?.id ?? '', id, file);
  }

  // DELETE /turmas/:id/relatorios
  @Delete(':id/relatorios')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancela a entrega do relatório nesta turma',
    description: 'Só dentro de 24h do envio. Depois disso, reenviar substitui a entrega.',
  })
  @ApiParam({ name: 'id', description: 'id da turma', format: 'uuid' })
  @ApiOkResponse({
    schema: { type: 'object', properties: { message: { type: 'string', example: 'Entrega cancelada' } } },
  })
  @ApiBadRequestResponse({
    schema: errorSchema('O prazo de 24h para cancelar o envio já passou', 'PRAZO_CANCELAMENTO_EXPIRADO'),
  })
  @ApiForbiddenResponse({ schema: errorSchema('Você não está vinculado a esta turma', 'TURMA_NAO_VINCULADA') })
  @ApiNotFoundResponse({ schema: errorSchema('Nenhuma entrega encontrada para esta turma') })
  async cancelarRelatorio(@Param('id') id: string, @Req() req: Request) {
    await this.turmaService.cancelarRelatorio(req.user?.id ?? '', id);
    return { message: 'Entrega cancelada' };
  }
}
