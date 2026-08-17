import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../../services/auth.service';

@Controller('users') // keep same base as legacy: auth endpoints live under /users
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    return await this.authService.login(body);
  }

  @Post('refresh')
  async refresh(@Body() body: any) {
    return await this.authService.refresh(body);
  }

  @Post('logout')
  async logout(@Body() body: any) {
    return await this.authService.logout(body);
  }
}
