import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ListaDeFormulariosService } from '../../services/listadeformularios.service';

// legacy router is mounted as /listas-formularios
@Controller('listas-formularios')
export class ListaDeFormulariosController {
  constructor(private readonly listaDeFormulariosService: ListaDeFormulariosService) {}

  @Post()
  async create(@Body() body: any) {
    return this.listaDeFormulariosService.create(body);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.listaDeFormulariosService.findById(id);
  }

  @Get('canteiro/:canteiroId')
  async findByCanteiro(@Param('canteiroId') canteiroId: string) {
    return this.listaDeFormulariosService.findByCanteiro(canteiroId);
  }

  @Get(':id/formularios')
  async findFormularios(@Param('id') id: string) {
    return this.listaDeFormulariosService.findFormularios(id);
  }
}
