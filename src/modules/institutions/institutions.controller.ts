import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { InstitutionService } from '../../services/institution.service';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  async findAll() {
    return this.institutionService.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    return this.institutionService.create(body);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.institutionService.findById(id);
  }
}
