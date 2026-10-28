import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma';
import { HttpError } from '../core/httpError';
import { removeStoredFile } from '../core/storage';
import argon2 from 'argon2';

@Injectable()
export class UserService {
  async create(body: any) {
    const { name, email, password, institutionId } = body ?? {};

    if (!name || !email || !password) {
      throw new HttpError('Name, email and password are required', 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError('email inválido', 400, { codigo: 'EMAIL_INVALIDO' });
    }

    if (password.length < 6) {
      throw new HttpError('password deve ter pelo menos 6 caracteres', 400);
    }

    if (institutionId) {
      const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
      if (!institution) {
        throw new HttpError('Instituição não encontrada', 400, { codigo: 'INSTITUICAO_INVALIDA' });
      }
    }

    await prisma.user.create({
      data: {
        name,
        email,
        // Cadastro público nunca decide o próprio role: senão qualquer um
        // vira "admin" ou "professor" só chamando a API direto.
        role: 'aluno',
        password: await argon2.hash(password),
        ...(institutionId && { institution: { connect: { id: institutionId } } }),
      },
      include: { institution: true },
    });
  }

  // select explícito: findMany() sem select devolvia o hash da senha de todo mundo.
  async getAll() {
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institution_id: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
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
        alunoTurmas: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            turma: {
              select: { id: true, name: true, period: { select: { id: true, name: true, semester: true } } },
            },
          },
        },
      },
    });

    if (!user) throw new HttpError('Usuário não encontrado', 404);

    // Vínculo mais recente do aluno; null quando não há turma.
    const { alunoTurmas, ...rest } = user;
    const turma = alunoTurmas[0]?.turma ?? null;
    return {
      ...rest,
      turma: turma ? { id: turma.id, name: turma.name } : null,
      academic_period: turma?.period ?? null,
    };
  }

  async updateProfile(
    id: string,
    body: { name?: string; password?: string; currentPassword?: string; institution_id?: string | null },
  ) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    const { name, password, currentPassword, institution_id } = body;
    const changesInstitution = institution_id !== undefined;
    if (!name && !password && !changesInstitution) {
      throw new HttpError('Informe name, password ou institution_id para atualizar', 400);
    }

    const data: any = {};
    if (name) {
      if (name.trim().length < 2) throw new HttpError('name deve ter pelo menos 2 caracteres', 400);
      data.name = name.trim();
    }
    if (password) {
      if (password.length < 6) throw new HttpError('password deve ter pelo menos 6 caracteres', 400);
      if (!currentPassword) throw new HttpError('Informe a senha atual para trocar a senha', 400);

      const current = await prisma.user.findUnique({ where: { id }, select: { password: true } });
      if (!current) throw new HttpError('Usuário não encontrado', 404);
      if (!(await argon2.verify(current.password, currentPassword))) {
        throw new HttpError('Senha atual incorreta', 400, { codigo: 'SENHA_ATUAL_INCORRETA' });
      }
      data.password = await argon2.hash(password);
    }
    if (changesInstitution) {
      if (institution_id === null) {
        data.institution = { disconnect: true };
      } else {
        const institution = await prisma.institution.findUnique({ where: { id: institution_id } });
        if (!institution) throw new HttpError('Instituição não encontrada', 404);
        data.institution = { connect: { id: institution_id } };
      }
    }

    return await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, institution_id: true },
    });
  }

  // Troca a turma do aluno: remove os vínculos atuais e cria o novo (ou só remove, se turmaId for null).
  async updateTurma(id: string, turmaId: string | null) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    if (turmaId) {
      const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
      if (!turma) throw new HttpError('Turma não encontrada', 404);
    }

    await prisma.$transaction([
      prisma.alunoTurma.deleteMany({ where: { user_id: id } }),
      ...(turmaId ? [prisma.alunoTurma.create({ data: { user_id: id, turma_id: turmaId } })] : []),
    ]);

    return await this.findById(id);
  }

  async updateAvatar(id: string, newUrl: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    if (!newUrl) throw new HttpError('avatarUrl é obrigatório', 400);

    const current = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
    if (!current) throw new HttpError('Usuário não encontrado', 404);

    const updated = await prisma.user.update({ where: { id }, data: { avatarUrl: newUrl }, select: { id: true, name: true, email: true, avatarUrl: true } });

    // Best-effort: remove a foto antiga (Blob ou disco) depois que a nova já
    // está gravada, para não acumular arquivo órfão a cada troca de avatar.
    if (current.avatarUrl && current.avatarUrl !== newUrl) {
      void removeStoredFile(current.avatarUrl);
    }

    return updated;
  }
}
