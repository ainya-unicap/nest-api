export interface HttpErrorDetalhe {
  /** Código estável para o front tratar sem depender do texto. */
  codigo?: string;
  /** Por campo: o que está errado nele. Ex.: { user_id: 'obrigatório' } */
  campos?: Record<string, string>;
}

export class HttpError extends Error {
  status: number;
  codigo?: string;
  campos?: Record<string, string>;

  constructor(message: string, status: number, detalhe: HttpErrorDetalhe = {}) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
    this.codigo = detalhe.codigo;
    this.campos = detalhe.campos;
  }
}

/**
 * Erro de validação com a lista do que está errado em cada campo.
 * A mensagem sai legível e o `campos` permite o front destacar os inputs.
 */
export function erroDeCampos(campos: Record<string, string>, codigo = 'VALIDACAO'): HttpError {
  const resumo = Object.entries(campos)
    .map(([campo, problema]) => `${campo}: ${problema}`)
    .join('; ');

  return new HttpError(resumo, 400, { codigo, campos });
}
