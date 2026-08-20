import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { HttpError } from './httpError';

// Sem este filtro, o HttpError lançado pelos services (que não estende
// HttpException) virava 500 no Nest — mesmo quando era 400/403/404.
// O formato da resposta ({ error: mensagem }) segue o do projeto original.
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, exception as any);
    }

    // Em rotas de stream (ex.: export-pdf) o header já pode ter sido enviado.
    if (response.headersSent) {
      return response.end();
    }

    return response.status(status).json({ error: message });
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpError) {
      return { status: exception.status, message: exception.message };
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as any)?.message ?? exception.message);

      return {
        status: exception.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : String(message),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
    };
  }
}
