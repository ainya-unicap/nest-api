import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';

import { IS_PUBLIC_KEY } from './public.decorator';
import { getJwtSecret } from './jwt';

// Equivalente ao requireAuth do projeto original, porém aplicado globalmente:
// tudo é protegido por padrão e só o que estiver marcado com @Public() escapa.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não enviado');
    }

    const token = header.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Token vazio');
    }

    try {
      const payload = jwt.verify(token, getJwtSecret()) as { sub: string };
      request.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
