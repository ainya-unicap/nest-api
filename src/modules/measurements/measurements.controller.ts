import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { MeasurementService } from '../../services/measurement.service';
import { ApiAuth } from '../../swagger/decorators';

const measurementSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    form_id: { type: 'string', format: 'uuid' },
    template_id: { type: 'string', format: 'uuid' },
    value: { type: 'number', example: 32.5 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const valueBody = {
  schema: {
    type: 'object' as const,
    required: ['value'],
    properties: { value: { type: 'number' as const, example: 32.5 } },
  },
};

@ApiTags('Measurements')
@ApiAuth()
@Controller('measurements')
export class MeasurementsController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma medição' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['form_id', 'template_id', 'value'],
      properties: {
        form_id: { type: 'string', format: 'uuid' },
        template_id: { type: 'string', format: 'uuid' },
        value: { type: 'number', example: 32.5 },
      },
    },
  })
  @ApiCreatedResponse({ schema: measurementSchema })
  async create(@Body() body: any) {
    return await this.measurementService.create(body);
  }

  @Post(['form/:formId', 'formulario/:formularioId'])
  @ApiOperation({
    summary: 'Cria em lote as medições de um formulário',
    description: 'Aceita os aliases /form/:formId e /formulario/:formularioId.',
  })
  @ApiParam({ name: 'formId', description: 'id do formulário', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['measurements'],
      properties: {
        measurements: {
          type: 'array',
          items: {
            type: 'object',
            required: ['template_id', 'value'],
            properties: {
              template_id: { type: 'string', format: 'uuid' },
              value: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiCreatedResponse({ schema: { type: 'array', items: measurementSchema } })
  async createManyForFormulario(
    @Param('formId') formId?: string,
    @Param('formularioId') formularioId?: string,
    @Body() body?: any,
  ) {
    const targetFormId = formId ?? formularioId;
    const { measurements } = body ?? {};

    return await this.measurementService.createManyForFormulario(targetFormId, measurements);
  }

  @Get(['form/:formId', 'formulario/:formularioId'])
  @ApiOperation({
    summary: 'Lista as medições de um formulário',
    description: 'Aceita os aliases /form/:formId e /formulario/:formularioId.',
  })
  @ApiParam({ name: 'formId', description: 'id do formulário', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'array', items: measurementSchema } })
  async findByFormulario(
    @Param('formId') formId?: string,
    @Param('formularioId') formularioId?: string,
  ) {
    return await this.measurementService.findByFormulario(formId ?? formularioId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza o valor de uma medição' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(valueBody)
  @ApiOkResponse({ schema: measurementSchema })
  async updateValue(@Param('id') id: string, @Body() body: any) {
    return await this.measurementService.updateValue(id, body?.value);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza o valor de uma medição (alias PUT)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody(valueBody)
  @ApiOkResponse({ schema: measurementSchema })
  async updateValuePut(@Param('id') id: string, @Body() body: any) {
    return await this.measurementService.updateValue(id, body?.value);
  }
}
