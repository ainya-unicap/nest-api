import { prisma } from '../prisma';

export class PlantTemplateRepository {
  findAll(plantId?: string) {
    return prisma.plantTemplate.findMany(plantId ? { where: { plant_id: plantId } } : undefined);
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
