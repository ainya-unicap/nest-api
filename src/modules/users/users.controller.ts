import { Controller, Post, Get, Put, Param, Body } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { UserService } from '../../services/user.service';
import { Public } from '../../core/auth/public.decorator';
import { ApiAuth, errorSchema } from '../../swagger/decorators';

const userSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Maria Silva' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['aluno', 'professor', 'admin'] },
    institution_id: { type: 'string', format: 'uuid', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // Público: a tela de cadastro precisa criar a conta antes de existir token.
  // login/refresh/logout ficam no AuthController.
  @Public()
  @Post()
  @ApiOperation({
    summary: 'Cria um usuário',
    description: 'Rota pública. A senha é gravada com hash argon2.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: { type: 'string', example: 'Maria Silva' },
        email: { type: 'string', format: 'email', example: 'maria@unicap.br' },
        password: { type: 'string', format: 'password', example: 'senha123' },
        role: { type: 'string', enum: ['aluno', 'professor', 'admin'], default: 'aluno' },
        institutionId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: { message: { type: 'string', example: 'created successfully' } },
    },
  })
  @ApiBadRequestResponse({ schema: errorSchema('Name, email and password are required') })
  async create(@Body() body: any) {
    await this.userService.create(body);
    return { message: 'created successfully' };
  }

  @Get()
  @ApiAuth()
  @ApiOperation({ summary: 'Lista todos os usuários' })
  @ApiOkResponse({ schema: { type: 'array', items: userSchema } })
  async getAll() {
    return await this.userService.getAll();
  }

  @Get(':id')
  @ApiAuth()
  @ApiOperation({ summary: 'Detalha um usuário (sem a senha)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: userSchema })
  @ApiNotFoundResponse({ schema: errorSchema('Usuário não encontrado') })
  async findById(@Param('id') id: string) {
    return await this.userService.findById(id);
  }

  @Put(':id/profile')
  @ApiAuth()
  @ApiOperation({
    summary: 'Atualiza nome e/ou senha',
    description: 'Envie ao menos um dos campos. name com 2+ caracteres, password com 6+.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, example: 'Maria S. Silva' },
        password: { type: 'string', format: 'password', minLength: 6 },
      },
    },
  })
  @ApiOkResponse({ schema: userSchema })
  @ApiBadRequestResponse({ schema: errorSchema('Informe name ou password para atualizar') })
  async updateProfile(@Param('id') id: string, @Body() body: any) {
    return await this.userService.updateProfile(id, body);
  }
}
