import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { UserCanteiroService } from '../../services/usercanteiro.service';


@Controller('user-canteiros')
export class UserCanteirosController {
  constructor(private readonly userCanteiroService: UserCanteiroService) {}

  @Post()
  async create(@Body() body: any) {
    return await this.userCanteiroService.create(body);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return await this.userCanteiroService.findByUser(userId);
  }

  @Get('canteiro/:canteiro_id')
  async findByCanteiro(@Param('canteiro_id') canteiro_id: string) {
    return await this.userCanteiroService.findByCanteiro(canteiro_id);
  }

  @Delete()
  async delete(@Body() body: any) {
    return await this.userCanteiroService.delete(body);
  }
}
