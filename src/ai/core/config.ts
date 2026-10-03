// Configuração lida do ambiente num lugar só. Os módulos importam `config`,
// nunca leem process.env direto — assim dá para ver tudo que a geração de
// resumo por IA usa aqui. Espelha ai-service/core/config.py.

export interface ConfigProvedor {
  apiKey: string;
  modelo: string;
  temperatura: number;
  maxTokens: number;
  // Só para modelos que raciocinam antes de responder: "low" | "medium" | "high".
  // Vazio = padrão do provedor.
  esforcoRaciocinio: string;
}

export interface Config {
  // Provedor usado quando o pedido não diz qual: "groq" ou "gemini".
  provedorPadrao: string;
  timeoutMs: number;
  groq: ConfigProvedor;
  gemini: ConfigProvedor;
}

export const config: Config = {
  provedorPadrao: (process.env.LLM_PROVIDER ?? 'groq').trim().toLowerCase(),
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 120_000),
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
    // GET /ai/modelos?provedor=groq lista o que a chave enxerga.
    modelo: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
    temperatura: Number(process.env.GROQ_TEMPERATURE ?? 0.3),
    // O gpt-oss raciocina antes de responder, e esse raciocínio conta aqui.
    // No plano gratuito a Groq limita 8000 tokens/minuto contando a entrada
    // (~3700 com este prompt) MAIS este teto: acima de ~4300 a chamada é recusada (413).
    maxTokens: Number(process.env.GROQ_MAX_TOKENS ?? 4000),
    esforcoRaciocinio: process.env.GROQ_REASONING_EFFORT ?? 'low',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    modelo: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    temperatura: Number(process.env.GEMINI_TEMPERATURE ?? 0.3),
    // Nos modelos 2.5 o "raciocínio" também consome esse limite; com pouco,
    // a resposta vem cortada no meio do JSON.
    maxTokens: Number(process.env.GEMINI_MAX_TOKENS ?? 8192),
    esforcoRaciocinio: '',
  },
};
