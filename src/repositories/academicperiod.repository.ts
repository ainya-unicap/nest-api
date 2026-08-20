import { prisma } from '../prisma';

export class AcademicPeriodRepository {
  create(data: any) {
    return prisma.academicPeriod.create({ data });
  }

  findAll() {
    return prisma.academicPeriod.findMany();
  }

  findById(id: string) {
    return prisma.academicPeriod.findUnique({ where: { id } });
  }

  update(id: string, data: any) {
    return prisma.academicPeriod.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.academicPeriod.delete({ where: { id } });
  }
}
