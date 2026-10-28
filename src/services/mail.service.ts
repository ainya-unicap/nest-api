import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null | undefined;

  private getTransporter(): Transporter | null {
    const host = process.env.SMTP_HOST;
    if (!host) return null;

    if (this.transporter === undefined) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }

    return this.transporter;
  }

  async enviarCodigoRecuperacao(destinatario: string, codigo: string): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      // Sem SMTP configurado: só é aceitável fora de produção, pra dar pra
      // testar o fluxo sem um servidor de e-mail de verdade. Nunca em prod.
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`SMTP não configurado — código de recuperação para ${destinatario}: ${codigo}`);
        return;
      }
      this.logger.error('SMTP não configurado em produção: e-mail de recuperação não foi enviado.');
      return;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#0B4A2F;">Recuperação de senha</h2>
        <p>Use o código abaixo para continuar a recuperação da sua senha:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0B4A2F; text-align: center;">${codigo}</p>
        <p>Esse código é válido por <strong>10 minutos</strong>.</p>
        <p style="color:#5B6B63; font-size: 13px;">Se você não pediu essa recuperação, ignore este e-mail. Nunca compartilhe este código com ninguém.</p>
      </div>
    `;
    const text =
      `Seu código de recuperação de senha é: ${codigo}\n\n` +
      'Ele é válido por 10 minutos.\n\n' +
      'Se você não pediu essa recuperação, ignore este e-mail e nunca compartilhe este código com ninguém.';

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: destinatario,
        subject: 'Código de recuperação de senha — DonkeyCode',
        text,
        html,
      });
    } catch (e: any) {
      // Nunca propaga: a resposta pro cliente já é a mesma (200 genérico)
      // independente do envio; só registra a falha pra investigação.
      this.logger.error(`Falha ao enviar e-mail de recuperação: ${e?.message ?? e}`);
    }
  }
}
