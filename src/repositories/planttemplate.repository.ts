import { prisma } from '../prisma';

export class PlantTemplateRepository {
  findAll() {
    return prisma.plantTemplate.findMany();
  }

  findById(id: string) {
    return prisma.plantTemplate.findUnique({ where: { id } });
  }

  create(data: any) {
    return prisma.plantTemplate.create({ data });
  }

  update(id: string, data: any) {
    return prisma.plantTemplate.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.plantTemplate.delete({ where: { id } });
  }
}
