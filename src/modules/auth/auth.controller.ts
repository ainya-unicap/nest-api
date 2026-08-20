import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from '../../services/auth.service';
import { Public } from '../../core/auth/public.decorator';
import { errorSchema } from '../../swagger/decorators';

const tokensSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    accessToken: { type: 'string', description: 'JWT válido por 15 minutos' },
    refreshToken: { type: 'string', description: 'Token opaco válido por 7 dias' },
  },
};

// Mantém a mesma base do projeto original: os endpoints de auth vivem sob /users.
@ApiTags('Auth')
@Controller('users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica e devolve o par de tokens',
    description:
      'Rota pública, protegida por rate limit: 10 tentativas por IP a cada 15 minutos.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'aluno@unicap.br' },
        password: { type: 'string', format: 'password', example: 'senha123' },
      },
    },
  })
  @ApiOkResponse({ description: 'Login efetuado', schema: tokensSchema })
  @ApiBadRequestResponse({ schema: errorSchema('Email and password are required') })
  @ApiUnauthorizedResponse({ schema: errorSchema('Invalid credentials') })
  @ApiTooManyRequestsResponse({
    schema: errorSchema('Muitas tentativas de login. Tente novamente em 15 minutos.'),
  })
  async login(@Body() body: any) {
    return await this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Troca o refreshToken por um novo par de tokens',
    description: 'O refreshToken usado é invalidado (rotation).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: { refreshToken: { type: 'string' } },
    },
  })
  @ApiOkResponse({ description: 'Novo par de tokens', schema: tokensSchema })
  @ApiBadRequestResponse({ schema: errorSchema('refreshToken é obrigatório') })
  @ApiUnauthorizedResponse({ schema: errorSchema('Invalid or expired refresh token') })
  async refresh(@Body('refreshToken') refreshToken?: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken é obrigatório');
    }

    return await this.authService.refresh(refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoga o refreshToken informado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: { refreshToken: { type: 'string' } },
    },
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { message: { type: 'string', example: 'Logout realizado com sucesso' } },
    },
  })
  @ApiBadRequestResponse({ schema: errorSchema('refreshToken é obrigatório') })
  async logout(@Body('refreshToken') refreshToken?: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken é obrigatório');
    }

    await this.authService.logout(refreshToken);
    return { message: 'Logout realizado com sucesso' };
  }
}
