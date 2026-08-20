import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { AlunoService } from '../../services/aluno.service';
import { ApiAuth } from '../../swagger/decorators';

// Espelha o alunoRouter do projeto original: só resumo e home.
// A tabela Aluno foi removida do schema (migration drop_dead_aluno_table),
// então não existe CRUD de aluno — o "aluno" é um User com role de aluno.
@ApiTags('Alunos')
@ApiAuth()
@Controller('alunos')
export class AlunosController {
  constructor(private readonly alunoService: AlunoService) {}

  @Get(':id/resumo')
  @ApiOperation({ summary: 'Números consolidados do aluno' })
  @ApiParam({ name: 'id', description: 'id do usuário', format: 'uuid' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        total_formularios: { type: 'integer', example: 12 },
        total_semanas: { type: 'integer', example: 5 },
        total_relatorios: { type: 'integer', example: 2 },
      },
    },
  })
  async getResumo(@Param('id') id: string) {
    return await this.alunoService.getResumo(id);
  }

  @Get(':userId/home')
  @ApiOperation({
    summary: 'Payload da tela inicial do aluno',
    description: 'Formulários recentes, canteiros vinculados e os totais do resumo.',
  })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        formularios_recentes: { type: 'array', items: { type: 'object' } },
        canteiros: { type: 'array', items: { type: 'object' } },
        total_listas: { type: 'integer' },
        total_formularios: { type: 'integer' },
        total_semanas: { type: 'integer' },
        total_relatorios: { type: 'integer' },
      },
    },
  })
  async getHome(@Param('userId') userId: string) {
    return await this.alunoService.getHome(userId);
  }
}
