import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import argon2 from 'argon2';

import { prisma } from '../prisma';
import { TurmaRepository } from '../repositories/turma.repository';
import { TurmaCodigoRepository } from '../repositories/turmacodigo.repository';
import { EntregaRelatorioRepository } from '../repositories/entregarelatorio.repository';
import { AcademicPeriodRepository } from '../repositories/academicperiod.repository';
import { InstitutionRepository } from '../repositories/institution.repository';
import { CanteiroRepository } from '../repositories/canteiro.repository';
import { HttpError, erroDeCampos } from '../core/httpError';
import { removeStoredFile } from '../core/storage';

// Sem 0/O, 1/I/L — tudo que confunde ao ditar ou digitar o código em sala.
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAMANHO_CODIGO = 6;

function gerarCodigoTurma(): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    codigo += ALFABETO_CODIGO[crypto.randomInt(0, ALFABETO_CODIGO.length)];
  }
  return codigo;
}

@Injectable()
export class ProfessorService {
  private readonly turmaRepo = new TurmaRepository();
  private readonly codigoRepo = new TurmaCodigoRepository();
  private readonly entregaRepo = new EntregaRelatorioRepository();
  private readonly periodRepo = new AcademicPeriodRepository();
  private readonly institutionRepo = new InstitutionRepository();
  private readonly canteiroRepo = new CanteiroRepository();

  // Cadastro simples: nome, e-mail, senha, confirmar senha. Sem trava por
  // enquanto (sem domínio institucional, sem aprovação). role é sempre
  // "professor" — nunca vem do corpo da requisição.
  async cadastrar(body: any) {
    const { name, email, password, confirmPassword } = body ?? {};

    if (!name || !email || !password) {
      throw new HttpError('name, email e password são obrigatórios', 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError('email inválido', 400, { codigo: 'EMAIL_INVALIDO' });
    }

    if (password.length < 6) {
      throw new HttpError('password deve ter pelo menos 6 caracteres', 400);
    }

    if (password !== confirmPassword) {
      throw new HttpError('As senhas não coincidem', 400, { codigo: 'SENHAS_DIFERENTES' });
    }

    try {
      await prisma.user.create({
        data: { name, email, role: 'professor', password: await argon2.hash(password) },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new HttpError('Já existe uma conta com este e-mail', 409, { codigo: 'EMAIL_JA_CADASTRADO' });
      }
      throw e;
    }
  }

  // Período: por id (já existente) ou por objeto { name, semester, start_date,
  // end_date } — busca por nome e, se não achar, cria na hora.
  private async resolverPeriodo(periodId: unknown, periodBody: any) {
    if (typeof periodId === 'string' && periodId) {
      const period = await this.periodRepo.findById(periodId);
      if (!period) throw new HttpError('Período letivo não encontrado', 400, { codigo: 'PERIODO_INVALIDO' });
      return period;
    }

    const name = typeof periodBody?.name === 'string' ? periodBody.name.trim() : '';
    if (!name) throw erroDeCampos({ period_id: 'obrigatório (period_id ou period.name)' }, 'TURMA_INVALIDA');

    const existente = await this.periodRepo.findByName(name);
    if (existente) return existente;

    const semester = typeof periodBody?.semester === 'string' ? periodBody.semester.trim() : '';
    const startDate = periodBody?.start_date ? new Date(periodBody.start_date) : null;
    const endDate = periodBody?.end_date ? new Date(periodBody.end_date) : null;

    const campos: Record<string, string> = {};
    if (!semester) campos['period.semester'] = 'obrigatório ao criar um período novo';
    if (!startDate || Number.isNaN(startDate.getTime())) campos['period.start_date'] = 'obrigatório, data válida';
    if (!endDate || Number.isNaN(endDate.getTime())) campos['period.end_date'] = 'obrigatório, data válida';
    if (Object.keys(campos).length > 0) throw erroDeCampos(campos, 'PERIODO_INVALIDO');

    return this.periodRepo.create({ name, semester, start_date: startDate, end_date: endDate });
  }

  // Instituição: por id, por objeto { name, abbreviation } (busca por nome,
  // cria se não achar), ou nenhuma (campo opcional na turma).
  private async resolverInstituicao(institutionId: unknown, institutionBody: any) {
    if (typeof institutionId === 'string' && institutionId) {
      const institution = await this.institutionRepo.findById(institutionId);
      if (!institution) {
        throw new HttpError('Instituição não encontrada', 400, { codigo: 'INSTITUICAO_INVALIDA' });
      }
      return institution;
    }

    const name = typeof institutionBody?.name === 'string' ? institutionBody.name.trim() : '';
    if (!name) return undefined;

    const existente = await this.institutionRepo.findByName(name);
    if (existente) return existente;

    const abbreviation = typeof institutionBody?.abbreviation === 'string' ? institutionBody.abbreviation.trim() : '';
    if (!abbreviation) {
      throw erroDeCampos(
        { 'institution.abbreviation': 'obrigatório ao criar uma instituição nova' },
        'INSTITUICAO_INVALIDA',
      );
    }

    try {
      return await this.institutionRepo.create({ name, abbreviation });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new HttpError('Já existe uma instituição com esta sigla', 409, { codigo: 'SIGLA_JA_CADASTRADA' });
      }
      throw e;
    }
  }

  async criarTurma(userId: string, body: any) {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 2) {
      throw erroDeCampos({ name: 'obrigatório, mínimo 2 caracteres' }, 'TURMA_INVALIDA');
    }

    const period = await this.resolverPeriodo(body?.period_id, body?.period);
    const institution = await this.resolverInstituicao(body?.institution_id, body?.institution);

    return this.turmaRepo.create({
      name,
      period_id: period.id,
      institution_id: institution?.id,
      created_by: userId,
    });
  }

  minhasTurmas(userId: string) {
    return this.turmaRepo.findByProfessor(userId);
  }

  private async validarDonaDaTurma(turmaId: string, userId: string) {
    const turma = await this.turmaRepo.findById(turmaId);
    if (!turma) throw new HttpError('Turma não encontrada', 404);
    if (turma.created_by !== userId) {
      throw new HttpError('Você só pode gerenciar as próprias turmas', 403);
    }
    return turma;
  }

  async apagarTurma(turmaId: string, userId: string) {
    await this.validarDonaDaTurma(turmaId, userId);

    const entregas = await this.entregaRepo.findByTurmaParaApagar(turmaId);

    // Vínculos, códigos e entregas somem em cascata no banco; só os arquivos
    // em si (Blob/disco) precisam de limpeza manual, depois de confirmado.
    await this.turmaRepo.delete(turmaId);
    await Promise.allSettled(entregas.map((e) => removeStoredFile(e.fileUrl)));
  }

  async gerarCodigo(turmaId: string, userId: string) {
    await this.validarDonaDaTurma(turmaId, userId);

    for (let tentativa = 0; tentativa < 5; tentativa++) {
      try {
        return await this.codigoRepo.create({ turma_id: turmaId, code: gerarCodigoTurma() });
      } catch (e: any) {
        if (e?.code !== 'P2002') throw e;
        // Colisão rara de código: tenta de novo com outro valor.
      }
    }

    throw new HttpError('Não foi possível gerar um código único. Tente novamente.', 503);
  }

  async listarCodigos(turmaId: string, userId: string) {
    await this.validarDonaDaTurma(turmaId, userId);
    return this.codigoRepo.findByTurma(turmaId);
  }

  async apagarCodigo(turmaId: string, codigoId: string, userId: string) {
    await this.validarDonaDaTurma(turmaId, userId);

    const codigo = await this.codigoRepo.findById(codigoId);
    if (!codigo || codigo.turma_id !== turmaId) {
      throw new HttpError('Código não encontrado nesta turma', 404);
    }

    await this.codigoRepo.delete(codigoId);
  }

  async listarEntregas(turmaId: string, userId: string) {
    await this.validarDonaDaTurma(turmaId, userId);
    return this.entregaRepo.findByTurma(turmaId);
  }

  // Todo aluno vinculado à turma, com a entrega dele (se houver) — diferente de
  // listarEntregas, que só traz quem já entregou.
  async listarAlunos(turmaId: string, userId: string) {
    await this.validarDonaDaTurma(turmaId, userId);

    const [vinculos, entregas] = await Promise.all([
      this.turmaRepo.findAlunosByTurma(turmaId),
      this.entregaRepo.findByTurma(turmaId),
    ]);

    const entregaPorAluno = new Map(entregas.map((e) => [e.user_id, e]));

    return vinculos.map((v) => {
      const entrega = entregaPorAluno.get(v.user_id);
      return {
        id: v.user.id,
        name: v.user.name,
        email: v.user.email,
        matricula: v.user.matricula,
        entrega: entrega
          ? {
              id: entrega.id,
              fileUrl: entrega.fileUrl,
              fileName: entrega.fileName,
              submittedAt: entrega.submittedAt,
            }
          : null,
      };
    });
  }

  // Canteiros que os alunos etiquetaram com esta turma, com a planta de cada
  // um — pra professora ver o que cada aluno registrou.
  async listarCanteiros(turmaId: string, userId: string) {
    await this.validarDonaDaTurma(turmaId, userId);

    const canteiros = await this.canteiroRepo.findByTurma(turmaId);
    return canteiros.map((c) => ({
      id: c.id,
      name: c.name,
      plant: c.plant,
      users: c.users.map((u) => u.user),
    }));
  }
}
