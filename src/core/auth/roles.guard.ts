import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ROLES_KEY } from './roles.decorator';
import { prisma } from '../../prisma';

// Roda depois do JwtAuthGuard (que já garante request.user.id). O JWT só
// guarda o id — nenhum role vai nele — então confere sempre fresco no banco,
// em vez de confiar num dado que pode ter ficado velho desde o login.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rolesPermitidos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rolesPermitidos || rolesPermitidos.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.id;
    if (!userId) throw new ForbiddenException('Token inválido');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || !rolesPermitidos.includes(user.role)) {
      throw new ForbiddenException('Você não tem permissão para esta ação');
    }

    return true;
  }
}
