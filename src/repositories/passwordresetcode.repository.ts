import { prisma } from '../prisma';

export class PasswordResetCodeRepository {
  create(data: { userId: string; codeHash: string; expiresAt: Date }) {
    return prisma.passwordResetCode.create({ data });
  }

  findLatestByUser(userId: string) {
    return prisma.passwordResetCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // "Ativo" = ainda não usado (usedAt null); pode estar expirado ou já
  // verificado — quem decide o que fazer com isso é o service.
  findLatestActiveByUser(userId: string) {
    return prisma.passwordResetCode.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  // "Invalida" sem apagar: marca usedAt pra tirar de circulação, mantendo
  // o histórico. Cobre tanto o código não verificado quanto o já verificado
  // (resetToken emitido mas ainda não usado para trocar a senha).
  invalidarNaoUsados(userId: string) {
    return prisma.passwordResetCode.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  incrementarTentativas(id: string) {
    return prisma.passwordResetCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  marcarVerificado(id: string, resetTokenHash: string, resetTokenExpiresAt: Date) {
    return prisma.passwordResetCode.update({
      where: { id },
      data: { verifiedAt: new Date(), resetTokenHash, resetTokenExpiresAt },
    });
  }

  marcarUsado(id: string) {
    return prisma.passwordResetCode.update({ where: { id }, data: { usedAt: new Date() } });
  }

  findByResetTokenHash(userId: string, resetTokenHash: string) {
    return prisma.passwordResetCode.findFirst({
      where: { userId, resetTokenHash, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
