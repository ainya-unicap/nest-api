import { prisma } from '../prisma';
import { User } from '@prisma/client';

export class UserRepository {
  async create(data: Partial<User> & { password: string }) {
    return prisma.user.create({ data });
  }

  async findAll() {
    return prisma.user.findMany();
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<User>) {
    return prisma.user.update({ where: { id }, data });
  }
}
