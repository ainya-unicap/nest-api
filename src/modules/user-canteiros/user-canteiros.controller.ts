import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { UserCanteiroService } from '../../services/usercanteiro.service';
import { ApiAuth } from '../../swagger/decorators';

const vinculoSchema = {
  type: 'object' as const,
  properties: {
    user_id: { type: 'string', format: 'uuid' },
    canteiro_id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

const vinculoBody = {
  schema: {
    type: 'object' as const,
    required: ['user_id', 'canteiro_id'],
    properties: {
      user_id: { type: 'string' as const, format: 'uuid' },
      canteiro_id: { type: 'string' as const, format: 'uuid' },
    },
  },
};

@ApiTags('UserCanteiros')
@ApiAuth()
@Controller('user-canteiros')
export class UserCanteirosController {
  constructor(private readonly userCanteiroService: UserCanteiroService) {}

  @Post()
  @ApiOperation({
    summary: 'Vincula um usuário a um canteiro',
    description: 'A chave primária é composta (user_id + canteiro_id), então não há duplicata.',
  })
  @ApiBody(vinculoBody)
  @ApiCreatedResponse({ schema: vinculoSchema })
  async create(@Body() body: any) {
    return await this.userCanteiroService.create(body);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lista os canteiros de um usuário' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async findByUser(@Param('userId') userId: string) {
    return await this.userCanteiroService.findByUser(userId);
  }

  @Get('canteiro/:canteiro_id')
  @ApiOperation({ summary: 'Lista os usuários de um canteiro' })
  @ApiParam({ name: 'canteiro_id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async findByCanteiro(@Param('canteiro_id') canteiro_id: string) {
    return await this.userCanteiroService.findByCanteiro(canteiro_id);
  }

  @Delete()
  @ApiOperation({
    summary: 'Remove o vínculo usuário/canteiro',
    description: 'Os ids vão no corpo da requisição, não na URL.',
  })
  @ApiBody(vinculoBody)
  @ApiOkResponse({ schema: vinculoSchema })
  async delete(@Body() body: any) {
    return await this.userCanteiroService.delete(body);
  }
}
