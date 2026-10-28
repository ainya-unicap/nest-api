import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import argon2 from 'argon2';

import { prisma } from '../prisma';
import { PasswordResetCodeRepository } from '../repositories/passwordresetcode.repository';
import { MailService } from './mail.service';
import { HttpError, erroDeCampos } from '../core/httpError';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_TENTATIVAS = 5;

function pepperOuFalha(): string {
  const p = process.env.PASSWORD_RESET_PEPPER;
  if (!p) {
    throw new HttpError('Recuperação de senha não está configurada no servidor', 503, {
      codigo: 'RECUPERACAO_MAL_CONFIGURADA',
    });
  }
  return p;
}

function hashComPepper(valor: string, pepper: string): string {
  return crypto.createHmac('sha256', pepper).update(valor).digest('hex');
}

// Comparação em tempo constante pra não vazar, pelo tempo de resposta, o
// quanto dos bytes do hash já bateu.
function hashesIguais(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function gerarCodigo(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function gerarResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function normalizarEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase();
}

@Injectable()
export class PasswordRecoveryService {
  private readonly repo = new PasswordResetCodeRepository();

  constructor(private readonly mailService: MailService) {}

  // Resposta do controller é SEMPRE a mesma, exista ou não a conta — este
  // método nunca deve deixar a diferença vazar nem pelo tipo de retorno.
  async solicitar(emailBruto: unknown): Promise<void> {
    const pepper = pepperOuFalha();
    const email = normalizarEmail(emailBruto);
    if (!email) throw new HttpError('email é obrigatório', 400);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Trabalho equivalente ao caminho "existe", pra não vazar pela
      // diferença de tempo de resposta (ao menos a parte de CPU — o envio
      // de e-mail de verdade continua sendo o maior diferencial de tempo,
      // mas replicar isso exigiria mandar um e-mail de verdade a toa).
      const fantasma = gerarCodigo();
      hashComPepper(fantasma, pepper);
      return;
    }

    const ultimo = await this.repo.findLatestByUser(user.id);
    if (ultimo && Date.now() - ultimo.createdAt.getTime() < COOLDOWN_MS) {
      // Dentro do intervalo mínimo: não reenvia, mas o controller responde
      // o mesmo 200 genérico de sempre.
      return;
    }

    await this.repo.invalidarNaoUsados(user.id);

    const codigo = gerarCodigo();
    const codeHash = hashComPepper(codigo, pepper);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.repo.create({ userId: user.id, codeHash, expiresAt });
    await this.mailService.enviarCodigoRecuperacao(user.email, codigo);
  }

  async verificar(emailBruto: unknown, codeBruto: unknown): Promise<{ resetToken: string }> {
    const pepper = pepperOuFalha();
    const email = normalizarEmail(emailBruto);
    const codigoDigitado = String(codeBruto ?? '').trim();
    if (!email || !codigoDigitado) throw new HttpError('email e code são obrigatórios', 400);

    const codigoInvalido = () =>
      new HttpError('Código inválido', 400, { codigo: 'CODIGO_INVALIDO' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw codigoInvalido();

    const registro = await this.repo.findLatestActiveByUser(user.id);
    if (!registro) throw codigoInvalido();

    if (registro.expiresAt < new Date()) {
      throw new HttpError('Código expirado', 400, { codigo: 'CODIGO_EXPIRADO' });
    }

    if (registro.attempts >= MAX_TENTATIVAS) {
      await this.repo.marcarUsado(registro.id);
      throw new HttpError('Número de tentativas excedido. Peça um novo código.', 400, {
        codigo: 'TENTATIVAS_EXCEDIDAS',
      });
    }

    const hashDigitado = hashComPepper(codigoDigitado, pepper);
    if (!hashesIguais(hashDigitado, registro.codeHash)) {
      const tentativas = registro.attempts + 1;
      await this.repo.incrementarTentativas(registro.id);

      if (tentativas >= MAX_TENTATIVAS) {
        await this.repo.marcarUsado(registro.id);
        throw new HttpError('Número de tentativas excedido. Peça um novo código.', 400, {
          codigo: 'TENTATIVAS_EXCEDIDAS',
        });
      }

      throw codigoInvalido();
    }

    const resetToken = gerarResetToken();
    const resetTokenHash = hashComPepper(resetToken, pepper);
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.repo.marcarVerificado(registro.id, resetTokenHash, resetTokenExpiresAt);

    return { resetToken };
  }

  async redefinir(emailBruto: unknown, resetTokenBruto: unknown, password: unknown): Promise<void> {
    const pepper = pepperOuFalha();
    const email = normalizarEmail(emailBruto);
    const resetToken = String(resetTokenBruto ?? '').trim();
    const senha = String(password ?? '');

    const campos: Record<string, string> = {};
    if (!email) campos.email = 'obrigatório';
    if (!resetToken) campos.resetToken = 'obrigatório';
    if (!senha || senha.length < 6) campos.password = 'deve ter pelo menos 6 caracteres';
    if (Object.keys(campos).length > 0) throw erroDeCampos(campos);

    const tokenInvalido = () =>
      new HttpError('Token inválido ou expirado', 400, { codigo: 'TOKEN_INVALIDO_OU_EXPIRADO' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw tokenInvalido();

    const resetTokenHash = hashComPepper(resetToken, pepper);
    const registro = await this.repo.findByResetTokenHash(user.id, resetTokenHash);

    if (!registro || !registro.resetTokenExpiresAt || registro.resetTokenExpiresAt < new Date()) {
      throw tokenInvalido();
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await argon2.hash(senha) },
    });

    await this.repo.marcarUsado(registro.id);

    // Uso único do resetToken já garantido por marcarUsado; aqui é a
    // revogação de sessões — a senha mudou, toda sessão anterior cai.
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });
  }
}
