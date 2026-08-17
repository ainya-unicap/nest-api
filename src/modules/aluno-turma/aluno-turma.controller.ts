import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { AlunoTurmaService } from '../../services/alunoturma.service';

@Controller('aluno-turma')
export class AlunoTurmaController {
  constructor(private readonly alunoTurmaService: AlunoTurmaService) {}

  @Post()
  async create(@Body() body: any) {
    return await this.alunoTurmaService.create(body);
  }

  @Get('turma/:turmaId')
  async findByTurma(@Param('turmaId') turmaId: string) {
    return await this.alunoTurmaService.findByTurma(turmaId);
  }

  @Delete()
  async delete(@Body() body: any) {
    return await this.alunoTurmaService.delete(body);
  }
}
