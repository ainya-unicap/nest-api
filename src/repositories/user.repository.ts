import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';

export class UserRepository {
  async create(data: Prisma.UserCreateInput | Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data });
  }

  async findAll() {
    return prisma.user.findMany();
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }
}
