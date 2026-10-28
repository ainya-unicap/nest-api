import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

import { PasswordRecoveryService } from '../../services/passwordrecovery.service';
import { Public } from '../../core/auth/public.decorator';
import { Recaptcha, RecaptchaGuard } from '../../core/recaptcha';
import { errorSchema } from '../../swagger/decorators';

const mensagemGenericaSchema = {
  type: 'object' as const,
  properties: {
    message: { type: 'string', example: 'Se o e-mail estiver cadastrado, enviamos um código.' },
  },
};

// Fluxo "Esqueci minha senha": usuário está deslogado, então tudo aqui é
// público. Vive sob /users junto com os demais endpoints de autenticação.
@ApiTags('Auth')
@Controller('users/password-recovery')
export class PasswordRecoveryController {
  constructor(private readonly passwordRecoveryService: PasswordRecoveryService) {}

  @Public()
  @Post('request')
  @HttpCode(HttpStatus.OK)
  @Recaptcha('recuperar_senha')
  @UseGuards(RecaptchaGuard)
  @ApiOperation({
    summary: 'Pede um código de recuperação de senha por e-mail',
    description:
      'Rota pública, protegida por reCAPTCHA e por rate limit (por IP e por e-mail). ' +
      'A resposta é sempre a mesma, exista ou não a conta — não revela se o e-mail está ' +
      'cadastrado. Dentro de 60s de um pedido anterior para o mesmo e-mail, não reenvia ' +
      '(mas responde o mesmo 200 de sempre).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'aluno@unicap.br' },
        recaptchaToken: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ description: 'Pedido processado (sempre a mesma resposta)', schema: mensagemGenericaSchema })
  @ApiBadRequestResponse({ schema: errorSchema('Captcha inválido', 'CAPTCHA_INVALIDO') })
  @ApiServiceUnavailableResponse({
    schema: errorSchema('Recuperação de senha não está configurada no servidor', 'RECUPERACAO_MAL_CONFIGURADA'),
  })
  @ApiTooManyRequestsResponse({ schema: errorSchema('Muitas tentativas. Tente novamente em 15 minutos.') })
  async request(@Body('email') email?: string) {
    await this.passwordRecoveryService.solicitar(email);
    return { message: 'Se o e-mail estiver cadastrado, enviamos um código.' };
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirma o código de 6 dígitos enviado por e-mail',
    description: 'Sucesso: devolve um resetToken (válido por 15 minutos) para o passo final de troca de senha.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'code'],
      properties: {
        email: { type: 'string', format: 'email', example: 'aluno@unicap.br' },
        code: { type: 'string', example: '482193' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Código válido',
    schema: { type: 'object', properties: { resetToken: { type: 'string' } } },
  })
  @ApiBadRequestResponse({
    description:
      'CODIGO_INVALIDO (inclui e-mail inexistente), CODIGO_EXPIRADO ou TENTATIVAS_EXCEDIDAS ' +
      '(ao chegar em 5 erros o código é invalidado e é preciso pedir outro).',
    schema: errorSchema('Código inválido', 'CODIGO_INVALIDO'),
  })
  async verify(@Body('email') email?: string, @Body('code') code?: string) {
    return await this.passwordRecoveryService.verificar(email, code);
  }

  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Define a nova senha usando o resetToken obtido em /verify' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'resetToken', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'aluno@unicap.br' },
        resetToken: { type: 'string' },
        password: { type: 'string', format: 'password', minLength: 6 },
      },
    },
  })
  @ApiOkResponse({
    description: 'Senha alterada. Todas as sessões anteriores (refresh tokens) são revogadas.',
    schema: { type: 'object', properties: { message: { type: 'string', example: 'Senha alterada com sucesso.' } } },
  })
  @ApiBadRequestResponse({
    description: 'TOKEN_INVALIDO_OU_EXPIRADO, ou VALIDACAO quando algum campo está ausente/inválido.',
    schema: errorSchema('Token inválido ou expirado', 'TOKEN_INVALIDO_OU_EXPIRADO'),
  })
  async reset(
    @Body('email') email?: string,
    @Body('resetToken') resetToken?: string,
    @Body('password') password?: string,
  ) {
    await this.passwordRecoveryService.redefinir(email, resetToken, password);
    return { message: 'Senha alterada com sucesso.' };
  }
}
