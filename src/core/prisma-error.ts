import { HttpError } from './httpError';

/**
 * Traduz erro do Prisma em algo que dá para agir.
 *
 * Sem isso, mandar um `list_id` que não existe no banco devolvia
 * `500 { "error": "Erro interno do servidor" }` — o erro mais inútil possível,
 * porque o problema era do cliente (400) e tinha nome e sobrenome.
 *
 * Reconhece por `code`/`name` em vez de `instanceof`: funciona mesmo se houver
 * mais de uma instância do Prisma Client carregada.
 */

// Nome legível do campo a partir do que o Prisma reporta.
// Vem como "Formulario_list_id_fkey", "..._key (index)" ou já como "list_id".
function nomeDoCampo(bruto: unknown): string | undefined {
  if (typeof bruto !== 'string') return undefined;

  const limpo = bruto.replace(/\s*\(index\)\s*$/, '').trim();
  const constraint = /^[A-Za-z]+_(.+?)_(?:fkey|key|unique)$/.exec(limpo);
  if (constraint) return constraint[1];

  return limpo || undefined;
}

/**
 * Onde o nome da constraint pode estar.
 *
 * Com o driver adapter do Prisma 7 o `meta.field_name` clássico não é mais
 * preenchido: o nome real fica dentro de `driverAdapterError.cause`. Sem olhar
 * ali, todo erro de FK sairia como "referência" em vez de "list_id".
 */
function constraintDoErro(meta: any): string | undefined {
  const cause = meta?.driverAdapterError?.cause;

  const candidatos = [
    meta?.field_name,
    meta?.column_name,
    meta?.constraint,
    cause?.constraint?.index,
    cause?.constraint?.fields?.[0],
  ];

  for (const c of candidatos) {
    const nome = nomeDoCampo(c);
    if (nome) return nome;
  }

  // Último recurso: a mensagem crua do Postgres traz o nome da constraint.
  const original = cause?.originalMessage;
  if (typeof original === 'string') {
    const m = /constraint "([^"]+)"/.exec(original);
    if (m) return nomeDoCampo(m[1]);
  }

  return undefined;
}

function alvo(meta: any): string[] {
  const t = meta?.target;
  if (Array.isArray(t)) return t.map(String);
  if (typeof t === 'string') return [t];

  const daConstraint = constraintDoErro(meta);
  return daConstraint ? [daConstraint] : [];
}

export function traduzirErroDoPrisma(e: any): HttpError | null {
  if (!e || typeof e !== 'object') return null;

  const nome = String(e.name ?? '');
  const code = String(e.code ?? '');
  const meta = e.meta ?? {};

  // --- Erros de validação: o formato da chamada está errado ---------------
  if (nome === 'PrismaClientValidationError') {
    const msg = String(e.message ?? '');

    // "Argument `started_at` is missing."
    const faltando = /Argument `(\w+)` is missing/.exec(msg);
    if (faltando) {
      const campo = faltando[1];
      return new HttpError(
        `Campo obrigatório ausente no banco: ${campo}`,
        400,
        { codigo: 'CAMPO_OBRIGATORIO', campos: { [campo]: 'obrigatório' } },
      );
    }

    // "Invalid value for argument `week`: ..." / "Got invalid value ... at `x`"
    const invalido =
      /Invalid value for argument `(\w+)`/.exec(msg) ?? /Argument `(\w+)`: Invalid value/.exec(msg);
    if (invalido) {
      const campo = invalido[1];
      return new HttpError(
        `Valor inválido para o campo ${campo}`,
        400,
        { codigo: 'VALOR_INVALIDO', campos: { [campo]: 'valor inválido' } },
      );
    }

    // "Unknown argument `semana`. Available options are ..."
    const desconhecido = /Unknown arg(?:ument)? `(\w+)`/.exec(msg);
    if (desconhecido) {
      const campo = desconhecido[1];
      return new HttpError(
        `Campo não existe no modelo: ${campo}`,
        400,
        { codigo: 'CAMPO_DESCONHECIDO', campos: { [campo]: 'não existe neste recurso' } },
      );
    }

    return new HttpError('Dados inválidos para esta operação', 400, { codigo: 'DADOS_INVALIDOS' });
  }

  if (nome === 'PrismaClientInitializationError') {
    return new HttpError('Banco de dados indisponível', 503, { codigo: 'BANCO_INDISPONIVEL' });
  }

  // --- Erros conhecidos, com código Pxxxx --------------------------------
  switch (code) {
    case 'P2002': {
      // Violação de unique
      const campos = alvo(meta);
      const lista = campos.join(', ') || 'campo único';
      return new HttpError(
        `Já existe um registro com este ${lista}`,
        409,
        {
          codigo: 'DUPLICADO',
          campos: Object.fromEntries(campos.map((c) => [c, 'já cadastrado'])),
        },
      );
    }

    case 'P2003': {
      // Violação de FK: o id enviado não existe na tabela de destino
      const campo = constraintDoErro(meta) ?? 'referência';
      return new HttpError(
        `${campo} aponta para um registro que não existe`,
        400,
        { codigo: 'REFERENCIA_INEXISTENTE', campos: { [campo]: 'não encontrado no banco' } },
      );
    }

    case 'P2014':
      return new HttpError(
        'A operação quebraria um vínculo obrigatório entre registros',
        400,
        { codigo: 'VINCULO_OBRIGATORIO' },
      );

    case 'P2025': {
      const causa = typeof meta.cause === 'string' ? ` (${meta.cause})` : '';
      return new HttpError(`Registro não encontrado${causa}`, 404, { codigo: 'NAO_ENCONTRADO' });
    }

    case 'P2000': {
      const campo = constraintDoErro(meta) ?? 'campo';
      return new HttpError(
        `O valor enviado em ${campo} é longo demais`,
        400,
        { codigo: 'VALOR_LONGO', campos: { [campo]: 'texto longo demais' } },
      );
    }

    case 'P2011': {
      const campo = constraintDoErro(meta) ?? 'campo';
      return new HttpError(
        `${campo} não pode ser nulo`,
        400,
        { codigo: 'NAO_NULO', campos: { [campo]: 'não pode ser nulo' } },
      );
    }

    // Timeouts / conexão
    case 'P1001':
    case 'P1002':
    case 'P1008':
    case 'P1017':
      return new HttpError(
        'Banco de dados não respondeu. Tente novamente em instantes.',
        503,
        { codigo: 'BANCO_TIMEOUT' },
      );

    default:
      // Qualquer outro Pxxxx: ainda é erro do banco, mas identificado.
      if (/^P\d{4}$/.test(code)) {
        return new HttpError(`Erro do banco de dados (${code})`, 500, { codigo: code });
      }
      return null;
  }
}
