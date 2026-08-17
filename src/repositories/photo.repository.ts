import { prisma } from '../prisma';

export class PhotoRepository {
  create(data: { form_id: string; url: string }) {
    return prisma.photo.create({ data });
  }

  findByFormulario(form_id: string) {
    return prisma.photo.findMany({ where: { form_id }, orderBy: { takenAt: 'desc' } });
  }

  delete(id: string) {
    return prisma.photo.delete({ where: { id } });
  }
}
