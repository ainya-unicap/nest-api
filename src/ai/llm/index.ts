// Provedores de LLM disponíveis. Para adicionar um novo: crie
// `llm/<nome>.llm.ts` com uma subclasse de ProvedorLLM, adicione a config em
// core/config.ts e registre aqui. Espelha ai-service/llm/__init__.py.

import { config } from '../core/config';
import { PedidoInvalido } from '../core/erros';
import { geminiLlm } from './gemini.llm';
import { groqLlm } from './groq.llm';
import { ProvedorLLM } from './base';

export const PROVEDORES: Record<string, ProvedorLLM> = {
  groq: groqLlm,
  gemini: geminiLlm,
};

/** Sem nome, usa o LLM_PROVIDER do .env. */
export function obterProvedor(nome?: string | null): ProvedorLLM {
  const chave = (nome || config.provedorPadrao).trim().toLowerCase();
  const provedor = PROVEDORES[chave];
  if (!provedor) {
    throw new PedidoInvalido(
      `Provedor '${chave}' desconhecido. Disponíveis: ${Object.keys(PROVEDORES).join(', ')}`,
    );
  }
  return provedor;
}

export { ProvedorLLM, type MensagemLLM, type RespostaLLM } from './base';
