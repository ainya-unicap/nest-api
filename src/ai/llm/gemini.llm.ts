// Chama o Gemini direto pela API REST, sem SDK.
// Espelha ai-service/llm/gemini_llm.py.

import { config } from '../core/config';
import { FalhaNoModelo, LimiteDeUso } from '../core/erros';
import { MensagemLLM, ProvedorLLM, RespostaLLM } from './base';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiLlm extends ProvedorLLM {
  readonly nome = 'gemini';
  readonly variavelChave = 'GEMINI_API_KEY';

  async gerarJson(mensagens: MensagemLLM[]): Promise<RespostaLLM> {
    this.exigirConfigurado();

    // O Gemini não tem papel "system" na lista de mensagens: o sistema vai em
    // systemInstruction e o resto vira o conteúdo.
    const sistema = mensagens
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const usuario = mensagens
      .filter((m) => m.role !== 'system')
      .map((m) => m.content)
      .join('\n\n');

    const corpo = {
      contents: [{ parts: [{ text: usuario }] }],
      ...(sistema ? { systemInstruction: { parts: [{ text: sistema }] } } : {}),
      generationConfig: {
        // Equivalente ao JSON mode da Groq.
        responseMimeType: 'application/json',
        temperature: this.cfg.temperatura,
        maxOutputTokens: this.cfg.maxTokens,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    let resposta: Response;
    try {
      resposta = await fetch(
        `${BASE_URL}/models/${this.cfg.modelo}:generateContent?key=${this.cfg.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
          signal: controller.signal,
        },
      );
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw new FalhaNoModelo(`Gemini não respondeu em ${config.timeoutMs}ms`);
      }
      throw new FalhaNoModelo(`Falha ao chamar o Gemini: ${e?.message ?? e}`);
    } finally {
      clearTimeout(timer);
    }

    if (!resposta.ok) {
      const texto = await resposta.text();
      if (resposta.status === 429) {
        throw new LimiteDeUso(`Limite de uso do Gemini atingido: ${texto}`);
      }
      throw new FalhaNoModelo(`Gemini respondeu ${resposta.status}: ${texto}`);
    }

    const json: any = await resposta.json();
    const uso = json.usageMetadata ?? {};
    const partes = json.candidates?.[0]?.content?.parts ?? [];

    return {
      conteudo: partes.map((p: { text?: string }) => p.text ?? '').join(''),
      modelo: json.modelVersion ?? this.cfg.modelo,
      tokensEntrada: uso.promptTokenCount ?? 0,
      tokensSaida: uso.candidatesTokenCount ?? 0,
    };
  }

  async listarModelos(): Promise<string[]> {
    this.exigirConfigurado();

    const resposta = await fetch(`${BASE_URL}/models?key=${this.cfg.apiKey}`);
    if (!resposta.ok) {
      throw new FalhaNoModelo(`Gemini respondeu ${resposta.status} ao listar modelos`);
    }
    const json: any = await resposta.json();
    return (json.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods ?? []).includes('generateContent'),
      )
      .map((m: { name: string }) => m.name.replace(/^models\//, ''))
      .sort();
  }
}

export const geminiLlm = new GeminiLlm(config.gemini);
