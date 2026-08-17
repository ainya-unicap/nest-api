import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma';
import { HttpError } from '../core/httpError';
import argon2 from 'argon2';

@Injectable()
export class UserService {
  async create(body: any) {
    if (!body.name || !body.email || !body.password) {
      throw new HttpError('Name, email and password are required', 400);
    }

    await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        password: await argon2.hash(body.password),
        ...(body.institutionId && {
          institution: { connect: { id: body.institutionId } },
        }),
      },
      include: { institution: true },
    });
  }

  async getAll() {
    return await prisma.user.findMany();
  }

  async findById(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institution_id: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        institution: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new HttpError('Usuário não encontrado', 404);
    return user;
  }

  async updateProfile(id: string, body: { name?: string; password?: string }) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    const { name, password } = body;
    if (!name && !password) throw new HttpError('Informe name ou password para atualizar', 400);

    const data: any = {};
    if (name) {
      if (name.trim().length < 2) throw new HttpError('name deve ter pelo menos 2 caracteres', 400);
      data.name = name;
    }
    if (password) {
      if (password.length < 6) throw new HttpError('password deve ter pelo menos 6 caracteres', 400);
      data.password = await argon2.hash(password);
    }

    const updated = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, institution_id: true } });
    return updated;
  }

  async updateAvatar(id: string, newUrl: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    if (!newUrl) throw new HttpError('avatarUrl é obrigatório', 400);

    const current = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
    if (!current) throw new HttpError('Usuário não encontrado', 404);

    const updated = await prisma.user.update({ where: { id }, data: { avatarUrl: newUrl }, select: { id: true, name: true, email: true, avatarUrl: true } });
    return updated;
  }
}
