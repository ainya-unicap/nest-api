// Chama a Groq direto pela API REST (compatível com o formato OpenAI), sem SDK.
// Espelha ai-service/llm/groq_llm.py.

import { config } from '../core/config';
import { FalhaNoModelo, LimiteDeUso } from '../core/erros';
import { MensagemLLM, ProvedorLLM, RespostaLLM } from './base';

const BASE_URL = 'https://api.groq.com/openai/v1';

export class GroqLlm extends ProvedorLLM {
  readonly nome = 'groq';
  readonly variavelChave = 'GROQ_API_KEY';

  async gerarJson(mensagens: MensagemLLM[]): Promise<RespostaLLM> {
    // Fora do try: o 503 de "chave não configurada" precisa chegar assim ao
    // controller, em vez de virar um 502 genérico de "falha ao chamar a Groq".
    this.exigirConfigurado();

    const corpo: Record<string, unknown> = {
      model: this.cfg.modelo,
      messages: mensagens,
      // JSON mode: garante objeto válido em vez de texto com crases em volta.
      response_format: { type: 'json_object' },
      temperature: this.cfg.temperatura,
      max_tokens: this.cfg.maxTokens,
    };
    if (this.cfg.esforcoRaciocinio) {
      corpo.reasoning_effort = this.cfg.esforcoRaciocinio;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    let resposta: Response;
    try {
      resposta = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify(corpo),
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw new FalhaNoModelo(`Groq não respondeu em ${config.timeoutMs}ms`);
      }
      throw new FalhaNoModelo(`Falha ao chamar a Groq: ${e?.message ?? e}`);
    } finally {
      clearTimeout(timer);
    }

    if (!resposta.ok) {
      const texto = await resposta.text();
      if (resposta.status === 429) {
        throw new LimiteDeUso(`Limite de uso da Groq atingido: ${texto}`);
      }
      // A Groq devolve 413 quando entrada + max_tokens passa do limite por minuto.
      if (resposta.status === 413) {
        throw new LimiteDeUso(
          `Pedido maior que o limite de tokens por minuto da Groq (reduza GROQ_MAX_TOKENS): ${texto}`,
        );
      }
      throw new FalhaNoModelo(`Groq respondeu ${resposta.status}: ${texto}`);
    }

    const json: any = await resposta.json();
    const uso = json.usage ?? {};

    return {
      conteudo: json.choices?.[0]?.message?.content ?? '',
      modelo: json.model ?? this.cfg.modelo,
      tokensEntrada: uso.prompt_tokens ?? 0,
      tokensSaida: uso.completion_tokens ?? 0,
    };
  }

  async listarModelos(): Promise<string[]> {
    this.exigirConfigurado();

    const resposta = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
    });
    if (!resposta.ok) {
      throw new FalhaNoModelo(`Groq respondeu ${resposta.status} ao listar modelos`);
    }
    const json: any = await resposta.json();
    return (json.data ?? []).map((m: { id: string }) => m.id).sort();
  }
}

export const groqLlm = new GroqLlm(config.groq);
