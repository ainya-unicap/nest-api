import { Injectable } from '@nestjs/common';
import { HttpError } from '../core/httpError';

// Serviço de IA (Eliza), hospedado em outro repositório/deploy. O Nest só
// repassa a chamada: o canteiro vai na URL, o token da sessão e a api key
// (opcional, por enquanto) vão nos headers.
//
// Sem fallback hardcoded de propósito: a URL do Eliza só vem da env var —
// um valor padrão escondido no código é fácil de esquecer de trocar entre
// ambientes (dev/staging/produção podem apontar pra deploys diferentes).
const ELIZA_API_KEY_PADRAO = process.env.ELIZA_API_KEY ?? '';
const ELIZA_TIMEOUT_MS = Number(process.env.ELIZA_TIMEOUT_MS ?? 60_000);

@Injectable()
export class ElizaService {
  /**
   * Pede o relatório por IA de um canteiro. `accessToken` é o mesmo token do
   * usuário logado (repassado como está, sem o prefixo "Bearer") — é assim
   * que o Eliza identifica de quem são os dados.
   *
   * `apiKey` é opcional: quem chama o nosso endpoint pode mandar a sua
   * própria (ex.: testando uma chave diferente); sem ela, usa o padrão do
   * `.env` (`ELIZA_API_KEY`). Pode não ir header nenhum, se nenhuma delas
   * estiver definida — o Eliza hoje não exige.
   */
  async gerarRelatorio(canteiroId: string, accessToken: string, apiKey?: string) {
    const baseUrl = process.env.ELIZA_API_URL;
    if (!baseUrl) {
      throw new HttpError('ELIZA_API_URL não configurada no servidor', 503, {
        codigo: 'ELIZA_MAL_CONFIGURADO',
      });
    }

    const chaveUsada = apiKey || ELIZA_API_KEY_PADRAO;
    const url = `${baseUrl}/chat/canteiros/${canteiroId}/formularios`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ELIZA_TIMEOUT_MS);

    let resposta: Response;
    try {
      resposta = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(chaveUsada ? { 'X-Api-Key': chaveUsada } : {}),
        },
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw new HttpError(`Eliza não respondeu em ${ELIZA_TIMEOUT_MS}ms`, 504, {
          codigo: 'ELIZA_TIMEOUT',
        });
      }
      throw new HttpError(`Falha ao chamar o Eliza: ${e?.message ?? e}`, 502, {
        codigo: 'ELIZA_INDISPONIVEL',
      });
    } finally {
      clearTimeout(timer);
    }

    const texto = await resposta.text();
    let corpo: unknown = texto;
    try {
      corpo = JSON.parse(texto);
    } catch {
      /* resposta não é JSON — devolve o texto cru */
    }

    if (!resposta.ok) {
      throw new HttpError(
        `Eliza respondeu ${resposta.status}`,
        resposta.status >= 500 ? 502 : resposta.status,
        { codigo: 'ELIZA_ERRO', campos: { detalhe: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) } },
      );
    }

    return corpo;
  }
}
