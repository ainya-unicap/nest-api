import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { PlantTemplateService } from '../../services/planttemplate.service';
import { ApiAuth } from '../../swagger/decorators';

const templateSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    plant_id: { type: 'string', format: 'uuid' },
    field_name: { type: 'string', example: 'Altura da planta' },
    unit: { type: 'string', example: 'cm' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const updateBody = {
  schema: {
    type: 'object' as const,
    properties: {
      field_name: { type: 'string' as const, example: 'Altura da planta' },
      unit: { type: 'string' as const, example: 'cm' },
    },
  },
};

@ApiTags('PlantTemplates')
@ApiAuth()
@Controller('plant-templates')
export class PlantTemplatesController {
  constructor(private readonly plantTemplateService: PlantTemplateService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os campos configuráveis',
    description:
      'Cada template é um campo medido/checado para uma planta forrageira. Sem `plant_id`, ' +
      'devolve os templates de TODAS as plantas — ao montar o formulário de uma planta ' +
      'específica, sempre filtre por `plant_id` para não misturar campos de outras plantas.',
  })
  @ApiQuery({ name: 'plant_id', required: false, description: 'Filtra só os templates desta planta' })
  @ApiOkResponse({ schema: { type: 'array', items: templateSchema } })
  async findAll(@Query('plant_id') plantId?: string) {
    return await this.plantTemplateService.findAll(plantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: templateSchema })
  async findById(@Param('id') id: string) {
    return await this.plantTemplateService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um template' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['plant_id', 'field_name', 'unit'],
      properties: {
        plant_id: { type: 'string', format: 'uuid' },
        field_name: { type: 'string', example: 'Altura da planta' },
        unit: { type: 'string', example: 'cm' },
      },
    },
  })
  @ApiCreatedResponse({ schema: templateSchema })
  async create(@Body() body: any) {
    return await this.plantTemplateService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza um template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(updateBody)
  @ApiOkResponse({ schema: templateSchema })
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.plantTemplateService.update(id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um template (alias PATCH)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(updateBody)
  @ApiOkResponse({ schema: templateSchema })
  async updatePartial(@Param('id') id: string, @Body() body: any) {
    return await this.plantTemplateService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: templateSchema })
  async delete(@Param('id') id: string) {
    return await this.plantTemplateService.delete(id);
  }
}
