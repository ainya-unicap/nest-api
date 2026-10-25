import { prisma } from '../prisma';

export class FormularioRepository {
  findManyByUser(user_id: string) {
    return prisma.formulario.findMany({ where: { user_id }, orderBy: { createdAt: 'desc' }, include: { list: { include: { plant: true } } } });
  }

  create(data: any) {
    return prisma.formulario.create({ data });
  }

  findById(id: string) {
    return prisma.formulario.findUnique({ where: { id }, include: { list: { include: { plant: true, canteiro: true } }, photos: true } });
  }

  // Versão enxuta, para checagem de dono antes de alterar/remover.
  findRaw(id: string) {
    return prisma.formulario.findUnique({ where: { id } });
  }

  update(id: string, data: any) {
    return prisma.formulario.update({ where: { id }, data });
  }

  // A FK de Photo é ON DELETE RESTRICT no banco, então os filhos precisam
  // sair antes — tudo na mesma transação.
  deleteWithChildren(id: string) {
    return prisma.$transaction([
      prisma.photo.deleteMany({ where: { form_id: id } }),
      prisma.formulario.delete({ where: { id } }),
    ]);
  }

  getPhotos(id: string) {
    return prisma.photo.findMany({ where: { form_id: id }, orderBy: { takenAt: 'desc' } });
  }

  finalizar(id: string) {
    return prisma.formulario.update({ where: { id }, data: { synced: true } });
  }

  // Sincroniza o formulário preenchido offline. O checklist agora são 5
  // colunas fixas no próprio Formulario — não cria mais linhas em Checklist/
  // Measurement (legado, mantido só para formulários antigos).
  async sync(id: string, body: any) {
    const { formulario, photos } = body;
    return prisma.$transaction(async (tx) => {
      const updated = await tx.formulario.update({
        where: { id },
        data: {
          type: formulario?.type,
          title: formulario?.title,
          date: formulario?.date ? new Date(formulario.date) : undefined,
          week: formulario?.week,
          weather: formulario?.weather,
          estimated_height_cm: formulario?.estimated_height_cm,
          phenological_stage: formulario?.phenological_stage,
          checklist_irrigacao: formulario?.checklist_irrigacao,
          checklist_capina: formulario?.checklist_capina,
          checklist_adubacao: formulario?.checklist_adubacao,
          checklist_plantio: formulario?.checklist_plantio,
          checklist_pragas: formulario?.checklist_pragas,
          observations: formulario?.observations,
          synced: true,
        },
      });

      if (Array.isArray(photos) && photos.length > 0) {
        await tx.photo.createMany({ data: photos.map((item: any) => ({ form_id: id, url: item.url })) });
      }

      return updated;
    });
  }
}
