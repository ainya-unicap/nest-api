import { Controller, Get, Post, Put, Patch, Delete, Param, Body } from '@nestjs/common';
import { PlantTemplateService } from '../../services/planttemplate.service';

@Controller('plant-templates')
export class PlantTemplatesController {
  constructor(private readonly plantTemplateService: PlantTemplateService) {}

  @Get()
  async findAll() {
    return await this.plantTemplateService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.plantTemplateService.findById(id);
  }

  @Post()
  async create(@Body() body: any) {
    return await this.plantTemplateService.create(body);
  }

  @Put(':id')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.plantTemplateService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.plantTemplateService.delete(id);
  }
}
