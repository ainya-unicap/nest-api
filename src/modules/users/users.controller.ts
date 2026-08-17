import { Controller, Post, Get, Put, Param, Body, Req } from '@nestjs/common';
import { Request } from 'express';

import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService, private readonly authService: AuthService) {}

  @Post()
  async create(@Body() body: any) {
    await this.userService.create(body);
    return { message: 'created successfully' };
  }

  @Post('login')
  async login(@Body() body: any) {
    const result = await this.authService.login(body);
    return result;
  }

  @Post('refresh')
  async refresh(@Body() body: any) {
    return await this.authService.refresh(body);
  }

  @Post('logout')
  async logout(@Body() body: any) {
    return await this.authService.logout(body);
  }

  @Get()
  async getAll() {
    return await this.userService.getAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.userService.findById(id);
  }

  @Put(':id/profile')
  async updateProfile(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    return await this.userService.updateProfile(id, body);
  }
}
