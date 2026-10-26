import { prisma } from '../prisma';

export class PlantaForrageiraRepository {
  findAll(filtros: { category?: string; semester_focus?: string }) {
    const { category, semester_focus } = filtros;

    return prisma.plantaForrageira.findMany({
      where: {
        ...(category ? { category } : {}),
        // Planta com foco "AMBOS" entra tanto no filtro de PRIMEIRO quanto no de SEGUNDO.
        ...(semester_focus ? { semester_focus: { in: [semester_focus, 'AMBOS'] } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return prisma.plantaForrageira.findUnique({ where: { id } });
  }
}
