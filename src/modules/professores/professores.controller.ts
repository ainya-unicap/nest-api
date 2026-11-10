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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ProfessorService } from '../../services/professor.service';
import { Public } from '../../core/auth/public.decorator';
import { Roles } from '../../core/auth/roles.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ApiAuth, erroDeValidacaoSchema, errorSchema } from '../../swagger/decorators';

const turmaSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Agronomia 2026.1 - Turma A' },
    period_id: { type: 'string', format: 'uuid' },
    institution_id: { type: 'string', format: 'uuid', nullable: true },
    created_by: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const codigoSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', example: 'A3F9K2' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

// Portal da professora: cadastro aqui, gestão de turma/código/entregas do
// outro lado (um site, não o app do aluno) — mesma API, módulo e tag
// separados pra facilitar achar isso no Swagger.
@ApiTags('Portal Professor')
@Controller('professores')
export class ProfessoresController {
  constructor(private readonly professorService: ProfessorService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Cadastra uma conta de professora',
    description: 'Nome, e-mail, senha e confirmação. Sem trava por enquanto. role é sempre "professor".',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password', 'confirmPassword'],
      properties: {
        name: { type: 'string', example: 'Maria Silva' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', format: 'password', minLength: 6 },
        confirmPassword: { type: 'string', format: 'password' },
      },
    },
  })
  @ApiCreatedResponse({
    schema: { type: 'object', properties: { message: { type: 'string', example: 'created successfully' } } },
  })
  @ApiBadRequestResponse({ schema: errorSchema('email inválido', 'EMAIL_INVALIDO') })
  @ApiConflictResponse({ schema: errorSchema('Já existe uma conta com este e-mail', 'EMAIL_JA_CADASTRADO') })
  async cadastrar(@Body() body: any) {
    await this.professorService.cadastrar(body);
    return { message: 'created successfully' };
  }

  @ApiAuth()
  @Roles('professor')
  @UseGuards(RolesGuard)
  @Post('turmas')
  @ApiOperation({ summary: 'Cria uma turma' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'period_id'],
      properties: {
        name: { type: 'string', example: 'Agronomia 2026.1 - Turma A' },
        period_id: { type: 'string', format: 'uuid' },
        institution_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiCreatedResponse({ schema: turmaSchema })
  @ApiBadRequestResponse({
    schema: erroDeValidacaoSchema({ name: 'obrigatório, mínimo 2 caracteres', period_id: 'obrigatório' }, 'TURMA_INVALIDA'),
  })
  @ApiForbiddenResponse({ schema: errorSchema('Você não tem permissão para esta ação') })
  async criarTurma(@Body() body: any, @Req() req: Request) {
    return await this.professorService.criarTurma(req.user?.id ?? '', body);
  }

  @ApiAuth()
  @Roles('professor')
  @UseGuards(RolesGuard)
  @Get('turmas')
  @ApiOperation({ summary: 'Lista as turmas criadas pela professora logada' })
  @ApiOkResponse({ schema: { type: 'array', items: turmaSchema } })
  async minhasTurmas(@Req() req: Request) {
    return await this.professorService.minhasTurmas(req.user?.id ?? '');
  }

  @ApiAuth()
  @Roles('professor')
  @UseGuards(RolesGuard)
  @Delete('turmas/:id')
  @ApiOperation({
    summary: 'Apaga uma turma',
    description:
      'Em cascata: vínculos de aluno, códigos e entregas de relatório dessa turma somem ' +
      'junto (os arquivos PDF também são removidos do armazenamento). Canteiros que tinham ' +
      'essa turma como lembrete só perdem a etiqueta — não são apagados.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'object', properties: { message: { type: 'string' } } } })
  @ApiForbiddenResponse({ schema: errorSchema('Você só pode gerenciar as próprias turmas') })
  @ApiNotFoundResponse({ schema: errorSchema('Turma não encontrada') })
  async apagarTurma(@Param('id') id: string, @Req() req: Request) {
    await this.professorService.apagarTurma(id, req.user?.id ?? '');
    return { message: 'Turma apagada com sucesso' };
  }

  @ApiAuth()
  @Roles('professor')
  @UseGuards(RolesGuard)
  @Post('turmas/:id/codigos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Gera um novo código pra turma',
    description: 'Vários códigos podem coexistir — gerar um novo não invalida os anteriores.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ schema: codigoSchema })
  @ApiForbiddenResponse({ schema: errorSchema('Você só pode gerenciar as próprias turmas') })
  @ApiNotFoundResponse({ schema: errorSchema('Turma não encontrada') })
  async gerarCodigo(@Param('id') id: string, @Req() req: Request) {
    return await this.professorService.gerarCodigo(id, req.user?.id ?? '');
  }

  @ApiAuth()
  @Roles('professor')
  @UseGuards(RolesGuard)
  @Get('turmas/:id/codigos')
  @ApiOperation({ summary: 'Lista os códigos ativos da turma' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: codigoSchema } })
  async listarCodigos(@Param('id') id: string, @Req() req: Request) {
    return await this.professorService.listarCodigos(id, req.user?.id ?? '');
  }

  @ApiAuth()
  @Roles('professor')
  @UseGuards(RolesGuard)
  @Delete('turmas/:id/codigos/:codigoId')
  @ApiOperation({ summary: 'Apaga um código específico (ex.: se vazou)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'codigoId', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'object', properties: { message: { type: 'string' } } } })
  @ApiForbiddenResponse({ schema: errorSchema('Você só pode gerenciar as próprias turmas') })
  @ApiNotFoundResponse({ schema: errorSchema('Código não encontrado nesta turma') })
  async apagarCodigo(
    @Param('id') id: string,
    @Param('codigoId') codigoId: string,
    @Req() req: Request,
  ) {
    await this.professorService.apagarCodigo(id, codigoId, req.user?.id ?? '');
    return { message: 'Código apagado com sucesso' };
  }

  @ApiAuth()
  @Roles('professor')
  @UseGuards(RolesGuard)
  @Get('turmas/:id/entregas')
  @ApiOperation({
    summary: 'Lista os relatórios (PDF) entregues pelos alunos nesta turma',
    description: 'Sem nota/feedback por enquanto — só a lista com link do arquivo e quem enviou.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fileUrl: { type: 'string' },
          fileName: { type: 'string' },
          submittedAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string' },
              matricula: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({ schema: errorSchema('Você só pode gerenciar as próprias turmas') })
  @ApiNotFoundResponse({ schema: errorSchema('Turma não encontrada') })
  async listarEntregas(@Param('id') id: string, @Req() req: Request) {
    return await this.professorService.listarEntregas(id, req.user?.id ?? '');
  }
}
