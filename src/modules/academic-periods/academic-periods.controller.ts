import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { AcademicPeriodService } from '../../services/academicperiod.service';

@Controller('academic-periods')
export class AcademicPeriodsController {
  constructor(private readonly academicPeriodService: AcademicPeriodService) {}

  @Get()
  async findAll() {
    return await this.academicPeriodService.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    return await this.academicPeriodService.create(body);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.academicPeriodService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.academicPeriodService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.academicPeriodService.delete(id);
  }
}
