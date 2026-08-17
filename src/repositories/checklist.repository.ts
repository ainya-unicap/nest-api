import { prisma } from '../prisma';

export class ChecklistRepository {
  createManyForFormulario(form_id: string, template_ids: string[]) {
    return prisma.checklist.createMany({ data: template_ids.map((template_id) => ({ form_id, template_id, checked: false })) });
  }

  updateChecked(id: string, checked: boolean) {
    return prisma.checklist.update({ where: { id }, data: { checked } });
  }

  findByFormulario(form_id: string) {
    return prisma.checklist.findMany({ where: { form_id }, include: { template: { select: { id: true, field_name: true, unit: true } } } });
  }

  create(data: any) {
    return prisma.checklist.create({ data });
  }
}
