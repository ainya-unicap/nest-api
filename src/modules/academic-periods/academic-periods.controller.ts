import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { AcademicPeriodService } from '../../services/academicperiod.service';
import { ApiAuth } from '../../swagger/decorators';

const periodSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: '2026.1' },
    semester: { type: 'string', enum: ['PRIMEIRO', 'SEGUNDO'] },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const periodBody = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, example: '2026.1' },
    semester: { type: 'string' as const, enum: ['PRIMEIRO', 'SEGUNDO'] },
    start_date: { type: 'string' as const, format: 'date-time' },
    end_date: { type: 'string' as const, format: 'date-time' },
  },
};

@ApiTags('AcademicPeriods')
@ApiAuth()
@Controller('academic-periods')
export class AcademicPeriodsController {
  constructor(private readonly academicPeriodService: AcademicPeriodService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os períodos letivos' })
  @ApiOkResponse({ schema: { type: 'array', items: periodSchema } })
  async findAll() {
    return await this.academicPeriodService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Cria um período letivo' })
  @ApiBody({
    schema: {
      ...periodBody,
      required: ['name', 'semester', 'start_date', 'end_date'],
    },
  })
  @ApiCreatedResponse({ schema: periodSchema })
  async create(@Body() body: any) {
    return await this.academicPeriodService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um período letivo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: periodSchema })
  async findById(@Param('id') id: string) {
    return await this.academicPeriodService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza um período letivo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ schema: periodBody })
  @ApiOkResponse({ schema: periodSchema })
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.academicPeriodService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um período letivo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: periodSchema })
  async delete(@Param('id') id: string) {
    return await this.academicPeriodService.delete(id);
  }
}
