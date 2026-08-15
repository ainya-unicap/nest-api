import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    try {
      const header = req.headers.authorization as string | undefined;
      if (!header || !header.startsWith('Bearer ')) return false;
      const token = header.slice('Bearer '.length).trim();
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      req.user = { id: payload.sub };
      return true;
    } catch (err) {
      return false;
    }
  }
}
