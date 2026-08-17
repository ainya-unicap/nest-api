import { prisma } from '../prisma';

export class FormularioRepository {
  findManyByUser(user_id: string) {
    return prisma.formulario.findMany({ where: { user_id }, orderBy: { createdAt: 'desc' }, include: { list: { include: { plant: true } } } });
  }

  create(data: any) {
    return prisma.formulario.create({ data });
  }

  findById(id: string) {
    return prisma.formulario.findUnique({ where: { id }, include: { list: { include: { plant: true, canteiro: true } }, checklists: { include: { template: true } }, measurements: { include: { template: true } }, photos: true } });
  }

  update(id: string, data: any) {
    return prisma.formulario.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.formulario.delete({ where: { id } });
  }

  getChecklist(id: string) {
    return prisma.checklist.findMany({ where: { form_id: id }, include: { template: { select: { id: true, field_name: true, unit: true } } } });
  }

  getMeasurements(id: string) {
    return prisma.measurement.findMany({ where: { form_id: id }, include: { template: { select: { id: true, field_name: true, unit: true } } } });
  }

  getPhotos(id: string) {
    return prisma.photo.findMany({ where: { form_id: id }, orderBy: { takenAt: 'desc' } });
  }

  finalizar(id: string) {
    return prisma.formulario.update({ where: { id }, data: { ended_at: new Date(), synced: true } });
  }

  async sync(id: string, body: any) {
    const { formulario, checklist, measurements, photos } = body;
    return prisma.$transaction(async (tx) => {
      const updated = await tx.formulario.update({ where: { id }, data: { type: formulario?.type, observations: formulario?.observations, started_at: formulario?.started_at ? new Date(formulario.started_at) : undefined, ended_at: formulario?.ended_at ? new Date(formulario.ended_at) : new Date(), synced: true } });

      if (Array.isArray(checklist) && checklist.length > 0) {
        await tx.checklist.createMany({ data: checklist.map((item: any) => ({ form_id: id, template_id: item.template_id, checked: item.checked ?? false })), skipDuplicates: true });
      }

      if (Array.isArray(measurements) && measurements.length > 0) {
        await tx.measurement.createMany({ data: measurements.map((item: any) => ({ form_id: id, template_id: item.template_id, value: item.value ?? 0 })), skipDuplicates: true });
      }

      if (Array.isArray(photos) && photos.length > 0) {
        await tx.photo.createMany({ data: photos.map((item: any) => ({ form_id: id, url: item.url })) });
      }

      return updated;
    });
  }
}
