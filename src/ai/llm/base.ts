// Contrato comum dos provedores de LLM. O gerador de resumo só conversa com
// ProvedorLLM; cada provedor traduz as mensagens e os erros da sua API REST
// para este formato. Espelha ai-service/llm/base.py.

import { ConfigProvedor } from '../core/config';
import { ProvedorNaoConfigurado } from '../core/erros';

export interface MensagemLLM {
  role: 'system' | 'user';
  content: string;
}

export interface RespostaLLM {
  conteudo: string;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
}

export abstract class ProvedorLLM {
  // Identificador usado no .env (LLM_PROVIDER), no pedido e na resposta.
  abstract readonly nome: string;
  // Nome da variável da chave, para a mensagem de erro dizer o que falta.
  abstract readonly variavelChave: string;

  constructor(protected readonly cfg: ConfigProvedor) {}

  get configurado(): boolean {
    return Boolean(this.cfg.apiKey);
  }

  get modelo(): string {
    return this.cfg.modelo;
  }

  protected exigirConfigurado(): void {
    if (!this.configurado) {
      throw new ProvedorNaoConfigurado(`${this.variavelChave} não configurada no .env`);
    }
  }

  /**
   * Recebe mensagens no formato [{role: system|user, content}] e devolve o
   * texto do modelo, que deve ser um objeto JSON. Erros da API saem como
   * LimiteDeUso ou FalhaNoModelo.
   */
  abstract gerarJson(mensagens: MensagemLLM[]): Promise<RespostaLLM>;

  abstract listarModelos(): Promise<string[]>;
}
