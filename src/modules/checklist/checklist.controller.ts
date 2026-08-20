import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ChecklistService } from '../../services/checklist.service';
import { ApiAuth } from '../../swagger/decorators';

const checklistSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    form_id: { type: 'string', format: 'uuid' },
    template_id: { type: 'string', format: 'uuid' },
    checked: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Checklist')
@ApiAuth()
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um item de checklist' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['form_id', 'template_id'],
      properties: {
        form_id: { type: 'string', format: 'uuid' },
        template_id: { type: 'string', format: 'uuid' },
        checked: { type: 'boolean', default: false },
      },
    },
  })
  @ApiCreatedResponse({ schema: checklistSchema })
  async create(@Body() body: any) {
    return await this.checklistService.create(body);
  }

  @Post('form/:formId')
  @ApiOperation({ summary: 'Cria em lote os itens de checklist de um formulário' })
  @ApiParam({ name: 'formId', description: 'id do formulário', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['template_ids'],
      properties: {
        template_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
    },
  })
  @ApiCreatedResponse({ schema: { type: 'array', items: checklistSchema } })
  async createManyForFormulario(@Param('formId') formId: string, @Body() body: { template_ids: string[] }) {
    const { template_ids } = body;
    return await this.checklistService.createManyForFormulario(formId, template_ids);
  }

  @Get('form/:formId')
  @ApiOperation({ summary: 'Lista os itens de checklist de um formulário' })
  @ApiParam({ name: 'formId', description: 'id do formulário', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: checklistSchema } })
  async findByFormulario(@Param('formId') formId: string) {
    return await this.checklistService.findByFormulario(formId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Marca ou desmarca um item' })
  @ApiParam({ name: 'id', description: 'id do item de checklist', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['checked'],
      properties: { checked: { type: 'boolean', example: true } },
    },
  })
  @ApiOkResponse({ schema: checklistSchema })
  async updateChecked(@Param('id') id: string, @Body() body: { checked: boolean }) {
    const { checked } = body;
    return await this.checklistService.updateChecked(id, checked);
  }
}
