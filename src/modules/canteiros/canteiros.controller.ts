import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CanteiroService } from '../../services/canteiro.service';
import { ApiAuth } from '../../swagger/decorators';

const canteiroSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Canteiro A1' },
    plant_id: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Canteiros')
@ApiAuth()
@Controller('canteiros')
export class CanteirosController {
  constructor(private readonly canteiroService: CanteiroService) {}

  // GET /canteiros?userId=...
  @Get()
  @ApiOperation({
    summary: 'Lista os canteiros de um usuário',
    description: 'Sem o parâmetro userId a resposta é uma lista vazia.',
  })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'uuid do usuário' })
  @ApiOkResponse({ schema: { type: 'array', items: canteiroSchema } })
  async findAll(@Query('userId') userId?: string): Promise<any> {
    if (userId) {
      return this.canteiroService.findByUser(userId);
    }
    // fallback: no userId provided — return empty list
    return [];
  }

  // POST /canteiros
  @Post()
  @ApiOperation({ summary: 'Cria um canteiro' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'plant_id'],
      properties: {
        name: { type: 'string', example: 'Canteiro A1' },
        plant_id: {
          type: 'string',
          format: 'uuid',
          description: 'id da planta forrageira cultivada',
        },
      },
    },
  })
  @ApiCreatedResponse({ schema: canteiroSchema })
  async create(@Body() body: any): Promise<any> {
    return this.canteiroService.create(body);
  }

  // GET /canteiros/:id/listas
  @Get(':id/listas')
  @ApiOperation({ summary: 'Lista as listas de formulários de um canteiro' })
  @ApiParam({ name: 'id', description: 'id do canteiro', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async findListasByCanteiro(@Param('id') id: string): Promise<any> {
    return this.canteiroService.findListasByCanteiro(id);
  }

  // GET /canteiros/user/:userId
  @Get('user/:userId')
  @ApiOperation({ summary: 'Lista os canteiros vinculados a um usuário' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: canteiroSchema } })
  async findByUser(@Param('userId') userId: string): Promise<any> {
    return this.canteiroService.findByUser(userId);
  }
}
