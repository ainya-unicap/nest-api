import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AlunoService } from '../../services/aluno.service';

@Controller('alunos')
export class AlunosController {
  constructor(private readonly alunoService: AlunoService) {}

  @Get(':id/resumo')
  async getResumo(@Param('id') id: string) {
    return await this.alunoService.getResumo(id);
  }

  @Get(':userId/home')
  async getHome(@Param('userId') userId: string) {
    return await this.alunoService.getHome(userId);
  }

  @Get()
  async list() {
    return await this.alunoService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.alunoService.findById(id);
  }

  @Post()
  async create(@Body() body: any) {
    return await this.alunoService.create(body);
  }
}
