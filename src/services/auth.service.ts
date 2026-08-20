import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma';
import { HttpError } from '../core/httpError';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getJwtSecret } from '../core/auth/jwt';

const isDev = process.env.NODE_ENV === 'development';

@Injectable()
export class AuthService {
  async login(body: any) {
    const { email, password } = body;

    if (!email || !password) {
      throw new HttpError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { institution: true },
    });

    if (!user) {
      if (isDev) {
        throw new HttpError('User not found', 404);
      } else {
        throw new HttpError('Invalid credentials', 401);
      }
    }

    const ok = await argon2.verify(user.password, password);
    if (!ok) {
      if (isDev) {
        throw new HttpError('Invalid password', 401);
      } else {
        throw new HttpError('Invalid credentials', 401);
      }
    }

    const tokens = await this.generateTokens(user.id);
    return { id: user.id, ...tokens };
  }

  private async generateTokens(userId: string) {
    const accessToken = jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: '15m' });

    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: userId,
        expiresAt: expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  async refresh(token: string) {
    const storedToken = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new HttpError('Invalid or expired refresh token', 401);
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    return this.generateTokens(storedToken.userId);
  }

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
}
