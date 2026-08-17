import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { FormularioService } from '../../services/formulario.service';
import { ChecklistService } from '../../services/checklist.service';
import { MeasurementService } from '../../services/measurement.service';

@Controller('formularios')
export class FormulariosController {
  constructor(
    private readonly formularioService: FormularioService,
    private readonly checklistService: ChecklistService,
    private readonly measurementService: MeasurementService,
  ) {}

  @Get()
  @Get('user/:userId')
  async findAllByUser(
    @Query('user_id') userIdQuery?: string,
    @Query('userId') userIdAltQuery?: string,
    @Param('userId') userIdParam?: string,
    @Req() req?: Request,
  ) {
    const userId = userIdParam ?? userIdQuery ?? userIdAltQuery ?? (req as any)?.user?.id;
    return await this.formularioService.findAllByUser(userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.formularioService.findById(id);
  }

  @Get(':id/checklist')
  async getChecklist(@Param('id') id: string) {
    return await this.formularioService.getChecklist(id);
  }

  @Get(':id/measurements')
  async getMeasurements(@Param('id') id: string) {
    return await this.formularioService.getMeasurements(id);
  }

  @Get(':id/photos')
  async getPhotos(@Param('id') id: string) {
    return await this.formularioService.getPhotos(id);
  }

  @Post()
  async create(@Body() body: any) {
    return await this.formularioService.create(body);
  }

  @Post(':id/checklist')
  async createChecklistForFormulario(@Param('id') id: string, @Body() body: any) {
    const { template_ids } = body;
    return await this.checklistService.createManyForFormulario(id, template_ids);
  }

  @Post(':id/measurements')
  async createMeasurementsForFormulario(@Param('id') id: string, @Body() body: any) {
    const { measurements } = body;
    return await this.measurementService.createManyForFormulario(id, measurements);
  }

  @Post(':id/finalizar')
  @Patch(':id/finalizar')
  async finalizar(@Param('id') id: string) {
    return await this.formularioService.finalizar(id);
  }

  @Post(':id/sync')
  async sync(@Param('id') id: string, @Body() body: any) {
    return await this.formularioService.sync(id, body);
  }

  @Put(':id')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.formularioService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any)?.user?.id;
    return await this.formularioService.delete(id, userId);
  }
}
