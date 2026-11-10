import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';

import { TurmaRepository } from '../repositories/turma.repository';
import { TurmaCodigoRepository } from '../repositories/turmacodigo.repository';
import { EntregaRelatorioRepository } from '../repositories/entregarelatorio.repository';
import { HttpError } from '../core/httpError';
import { persistUploadedFile, removeStoredFile } from '../core/storage';

const MAX_PAGINAS_PDF = 10;
const PRAZO_CANCELAMENTO_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TurmaService {
  private readonly repo = new TurmaRepository();
  private readonly codigoRepo = new TurmaCodigoRepository();
  private readonly entregaRepo = new EntregaRelatorioRepository();

  // Tela de perfil: turmas em que o aluno está vinculado.
  async minhasTurmas(userId: string) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const vinculos = await this.repo.findByAluno(userId);
    return vinculos.map((v) => v.turma);
  }

  // Igual a entrar numa chamada por código: o aluno nunca vê/escolhe o id
  // da turma diretamente, só o código que a professora repassou.
  async entrarComCodigo(userId: string, codeBruto: unknown) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const code = String(codeBruto ?? '').trim().toUpperCase();
    if (!code) throw new HttpError('code é obrigatório', 400);

    const turmaCodigo = await this.codigoRepo.findByCode(code);
    if (!turmaCodigo) {
      throw new HttpError('Código inválido', 404, { codigo: 'CODIGO_INVALIDO' });
    }

    const jaVinculado = await this.repo.temVinculo(userId, turmaCodigo.turma_id);
    if (jaVinculado) {
      throw new HttpError('Você já está vinculado a esta turma', 409, {
        codigo: 'JA_VINCULADO',
      });
    }

    await this.repo.vincularAluno(userId, turmaCodigo.turma_id);
    return this.repo.findById(turmaCodigo.turma_id);
  }

  private async validarVinculo(userId: string, turmaId: string) {
    if (!turmaId) throw new HttpError('turmaId é obrigatório', 400);
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const turma = await this.repo.findById(turmaId);
    if (!turma) throw new HttpError('Turma não encontrada', 404);

    const vinculado = await this.repo.temVinculo(userId, turmaId);
    if (!vinculado) {
      throw new HttpError('Você não está vinculado a esta turma', 403, {
        codigo: 'TURMA_NAO_VINCULADA',
      });
    }
  }

  private lerBytesDoArquivo(file: Express.Multer.File): Buffer {
    return file.buffer ?? fs.readFileSync(file.path);
  }

  // Entrega do relatório (PDF de origem qualquer, sem relação com os dados
  // do app) pra turma. Reenviar pra mesma turma substitui o que já existia.
  async enviarRelatorio(userId: string, turmaId: string, file?: Express.Multer.File) {
    await this.validarVinculo(userId, turmaId);

    if (!file) throw new HttpError('Arquivo PDF é obrigatório', 400);

    const bytes = this.lerBytesDoArquivo(file);
    let paginas: number;
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      paginas = pdf.getPageCount();
    } catch {
      throw new HttpError('Arquivo PDF inválido ou corrompido', 400, { codigo: 'PDF_INVALIDO' });
    }

    if (paginas > MAX_PAGINAS_PDF) {
      throw new HttpError(`O PDF tem ${paginas} páginas; o máximo permitido é ${MAX_PAGINAS_PDF}`, 400, {
        codigo: 'PDF_MUITAS_PAGINAS',
      });
    }

    const existente = await this.entregaRepo.findByUserETurma(userId, turmaId);

    const fileUrl = await persistUploadedFile(file, 'entregas-relatorio');
    const entrega = await this.entregaRepo.upsert(userId, turmaId, {
      fileUrl,
      fileName: file.originalname,
    });

    // Só depois de confirmar a nova entrega: remove o arquivo antigo.
    if (existente) await removeStoredFile(existente.fileUrl);

    return entrega;
  }

  // Só dentro de 24h do envio — depois disso, o jeito de "corrigir" é
  // reenviar (o que já substitui o anterior).
  async cancelarRelatorio(userId: string, turmaId: string) {
    await this.validarVinculo(userId, turmaId);

    const entrega = await this.entregaRepo.findByUserETurma(userId, turmaId);
    if (!entrega) throw new HttpError('Nenhuma entrega encontrada para esta turma', 404);

    const prazoExpirado = Date.now() - entrega.submittedAt.getTime() > PRAZO_CANCELAMENTO_MS;
    if (prazoExpirado) {
      throw new HttpError('O prazo de 24h para cancelar o envio já passou', 400, {
        codigo: 'PRAZO_CANCELAMENTO_EXPIRADO',
      });
    }

    await this.entregaRepo.delete(userId, turmaId);
    await removeStoredFile(entrega.fileUrl);
  }
}
