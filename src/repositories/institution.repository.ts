import { prisma } from '../prisma';

export class InstitutionRepository {
  create(data: any) {
    return prisma.institution.create({ data });
  }

  findAll() {
    return prisma.institution.findMany();
  }

  findById(id: string) {
    return prisma.institution.findUnique({ where: { id } });
  }
}
