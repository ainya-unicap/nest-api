import { prisma } from '../prisma';

export class MeasurementRepository {
  createManyForFormulario(form_id: string, measurements: { template_id: string; value?: number }[]) {
    return prisma.measurement.createMany({ data: measurements.map((m) => ({ form_id, template_id: m.template_id, value: m.value ?? 0 })) });
  }

  updateValue(id: string, value: number) {
    return prisma.measurement.update({ where: { id }, data: { value } });
  }

  findByFormulario(form_id: string) {
    return prisma.measurement.findMany({ where: { form_id }, include: { template: { select: { id: true, field_name: true, unit: true } } } });
  }

  create(data: any) {
    return prisma.measurement.create({ data });
  }
}
