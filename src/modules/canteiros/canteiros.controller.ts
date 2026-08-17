import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { CanteiroService } from '../../services/canteiro.service';


@Controller('canteiros')
export class CanteirosController {
  constructor(private readonly canteiroService: CanteiroService) {}

  // GET /canteiros?userId=...
  @Get()
  async findAll(@Query('userId') userId?: string): Promise<any> {
    if (userId) {
      return this.canteiroService.findByUser(userId);
    }
    // fallback: no userId provided — return empty list
    return [];
  }

  // POST /canteiros
  @Post()
  async create(@Body() body: any): Promise<any> {
    return this.canteiroService.create(body);
  }

  // GET /canteiros/:id/listas
  @Get(':id/listas')
  async findListasByCanteiro(@Param('id') id: string): Promise<any> {
    return this.canteiroService.findListasByCanteiro(id);
  }

  // GET /canteiros/user/:userId
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string): Promise<any> {
    return this.canteiroService.findByUser(userId);
  }
}
