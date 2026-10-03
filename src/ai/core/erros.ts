import { HttpError } from '../../core/httpError';

// Erros de domínio da geração de resumo por IA. Espelham os de
// ai-service/core/erros.py — mesmos nomes, mesmos status HTTP — para quem já
// conhece o serviço Python entender isto sem precisar reaprender nada.

export class PedidoInvalido extends HttpError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class DossieInvalido extends HttpError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class LimiteDeUso extends HttpError {
  constructor(message: string) {
    super(message, 429);
  }
}

export class FalhaNoModelo extends HttpError {
  constructor(message: string) {
    super(message, 502);
  }
}

export class ProvedorNaoConfigurado extends HttpError {
  constructor(message: string) {
    super(message, 503);
  }
}
