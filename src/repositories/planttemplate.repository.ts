import { prisma } from '../prisma';

export class PlantTemplateRepository {
  findAll() {
    return prisma.plantTemplate.findMany();
  }

  findById(id: string) {
    return prisma.plantTemplate.findUnique({ where: { id } });
  }

  create(data: any) {
    return prisma.planttemplate.create({ data });
  }

  update(id: string, data: any) {
    return prisma.planttemplate.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.planttemplate.delete({ where: { id } });
  }
}
