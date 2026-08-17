import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import { ChecklistService } from '../../services/checklist.service';

@Controller('checklist')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Post()
  async create(@Body() body: any) {
    return await this.checklistService.create(body);
  }

  @Post('form/:formId')
  async createManyForFormulario(@Param('formId') formId: string, @Body() body: { template_ids: string[] }) {
    const { template_ids } = body;
    return await this.checklistService.createManyForFormulario(formId, template_ids);
  }

  @Get('form/:formId')
  async findByFormulario(@Param('formId') formId: string) {
    return await this.checklistService.findByFormulario(formId);
  }

  @Patch(':id')
  async updateChecked(@Param('id') id: string, @Body() body: { checked: boolean }) {
    const { checked } = body;
    return await this.checklistService.updateChecked(id, checked);
  }
}
