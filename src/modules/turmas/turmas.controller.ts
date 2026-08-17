import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { TurmaService } from '../../services/turma.service';

@Controller('turmas')
export class TurmasController {
  constructor(private readonly turmaService: TurmaService) {}

  @Get()
  async findAll() {
    return await this.turmaService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.turmaService.findById(id);
  }

  @Post()
  async create(@Body() body: any) {
    return await this.turmaService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.turmaService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.turmaService.delete(id);
  }
}
