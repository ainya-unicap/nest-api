import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { MeasurementService } from '../../services/measurement.service';

@Controller('measurements')
export class MeasurementsController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Post()
  async create(@Body() body: any) {
    return await this.measurementService.create(body);
  }

  @Post('form/:formId')
  @Post('formulario/:formularioId')
  async createManyForFormulario(
    @Param('formId') formId?: string,
    @Param('formularioId') formularioId?: string,
    @Body() body?: any,
  ) {
    const targetFormId = formId ?? formularioId;
    const { measurements } = body ?? {};

    return await this.measurementService.createManyForFormulario(targetFormId, measurements);
  }

  @Get('form/:formId')
  @Get('formulario/:formularioId')
  async findByFormulario(
    @Param('formId') formId?: string,
    @Param('formularioId') formularioId?: string,
  ) {
    return await this.measurementService.findByFormulario(formId ?? formularioId);
  }

  @Patch(':id')
  @Put(':id')
  async updateValue(@Param('id') id: string, @Body() body: any) {
    return await this.measurementService.updateValue(id, body?.value);
  }
}

