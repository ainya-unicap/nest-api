import { prisma } from '../prisma';

export class InstitutionRepository {
  create(data: any) {
    return prisma.institution.create({ data });
  }

  // Ordenado: a listagem alimenta o seletor de instituição no app.
  findAll() {
    return prisma.institution.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return prisma.institution.findUnique({ where: { id } });
  }
}
