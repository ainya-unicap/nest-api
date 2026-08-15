import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpError } from '../core/httpError';

@Controller('users')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    try {
      return await this.authService.login(body);
    } catch (err: any) {
      throw new HttpError(err.message || 'Error', err.status || 500);
    }
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken?: string }) {
    try {
      if (!body.refreshToken) throw new HttpError('refreshToken é obrigatório', 400);
      return await this.authService.refresh(body.refreshToken);
    } catch (err: any) {
      throw new HttpError(err.message || 'Error', err.status || 500);
    }
  }

  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }) {
    try {
      if (!body.refreshToken) throw new HttpError('refreshToken é obrigatório', 400);
      await this.authService.logout(body.refreshToken);
      return { message: 'Logout realizado com sucesso' };
    } catch (err: any) {
      throw new HttpError(err.message || 'Error', err.status || 500);
    }
  }
}
