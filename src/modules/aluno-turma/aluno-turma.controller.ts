import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { AlunoTurmaService } from '../../services/alunoturma.service';
import { ApiAuth } from '../../swagger/decorators';

const matriculaSchema = {
  type: 'object' as const,
  properties: {
    user_id: { type: 'string', format: 'uuid' },
    turma_id: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('AlunoTurma')
@ApiAuth()
@Controller('aluno-turma')
export class AlunoTurmaController {
  constructor(private readonly alunoTurmaService: AlunoTurmaService) {}

  @Post()
  @ApiOperation({
    summary: 'Matricula um aluno numa turma',
    description: 'A chave primária é composta (user_id + turma_id), então não há duplicata.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['user_id', 'turma_id'],
      properties: {
        user_id: { type: 'string', format: 'uuid' },
        turma_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiCreatedResponse({ schema: matriculaSchema })
  async create(@Body() body: any) {
    return await this.alunoTurmaService.create(body);
  }

  @Get('turma/:turmaId')
  @ApiOperation({ summary: 'Lista as matrículas de uma turma' })
  @ApiParam({ name: 'turmaId', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: matriculaSchema } })
  async findByTurma(@Param('turmaId') turmaId: string) {
    return await this.alunoTurmaService.findByTurma(turmaId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Remove a matrícula',
    description:
      'Atenção: o repositório lê o campo aluno_id (não user_id) para localizar o vínculo.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['aluno_id', 'turma_id'],
      properties: {
        aluno_id: { type: 'string', format: 'uuid', description: 'id do usuário aluno' },
        turma_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOkResponse({ schema: matriculaSchema })
  async delete(@Body() body: any) {
    return await this.alunoTurmaService.delete(body);
  }
}
