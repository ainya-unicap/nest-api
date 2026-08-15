import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpError } from '../core/httpError';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  private isDev = process.env.NODE_ENV === 'development';

  async login(body: any) {
    const { email, password } = body;

    if (!email || !password) {
      throw new HttpError('Email and password are required', 400);
    }

    const user = await this.prisma.user.findUnique({ where: { email }, include: { institution: true } });

    if (!user) {
      if (this.isDev) throw new HttpError('User not found', 404);
      else throw new HttpError('Invalid credentials', 401);
    }

    const ok = await argon2.verify(user.password, password);
    if (!ok) {
      if (this.isDev) throw new HttpError('Invalid password', 401);
      else throw new HttpError('Invalid credentials', 401);
    }

    const tokens = await this.generateTokens(user.id);
    return { id: user.id, ...tokens };
  }

  private async generateTokens(userId: string) {
    const accessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });

    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({ data: { token: refreshTokenValue, userId, expiresAt } });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  async refresh(token: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new HttpError('Invalid or expired refresh token', 401);
    }

    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    return this.generateTokens(storedToken.userId);
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
  }
}
