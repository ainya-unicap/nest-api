from google import genai
from google.genai import errors, types

from core.erros import FalhaNoModelo, LimiteDeUso
from llm.base import ProvedorLLM, RespostaLLM


class GeminiLLM(ProvedorLLM):
    nome = "gemini"
    variavel_chave = "GEMINI_API_KEY"

    def _criar_cliente(self) -> genai.Client:
        return genai.Client(api_key=self.cfg.api_key)

    def gerar_json(self, mensagens: list[dict]) -> RespostaLLM:
        # O Gemini não tem papel "system" na lista de mensagens: o sistema vai em
        # system_instruction e o resto vira o conteúdo.
        sistema = "\n\n".join(m["content"] for m in mensagens if m["role"] == "system")
        usuario = "\n\n".join(m["content"] for m in mensagens if m["role"] != "system")

        gemini = self.cliente()
        try:
            resposta = gemini.models.generate_content(
                model=self.cfg.modelo,
                contents=usuario,
                config=types.GenerateContentConfig(
                    system_instruction=sistema or None,
                    # Equivalente ao JSON mode da Groq.
                    response_mime_type="application/json",
                    temperature=self.cfg.temperatura,
                    max_output_tokens=self.cfg.max_tokens,
                ),
            )
        except errors.APIError as e:
            if e.code == 429:
                raise LimiteDeUso(f"Limite de uso do Gemini atingido: {e}") from e
            raise FalhaNoModelo(f"Gemini respondeu {e.code}: {e}") from e
        except Exception as e:  # rede, DNS
            raise FalhaNoModelo(f"Falha ao chamar o Gemini: {e}") from e

        uso = resposta.usage_metadata
        return RespostaLLM(
            conteudo=resposta.text or "",
            modelo=resposta.model_version or self.cfg.modelo,
            tokens_entrada=getattr(uso, "prompt_token_count", 0) or 0,
            tokens_saida=getattr(uso, "candidates_token_count", 0) or 0,
        )

    def listar_modelos(self) -> list[str]:
        # A API devolve "models/gemini-2.5-flash"; o SDK aceita o id sem o prefixo.
        return sorted(
            (m.name or "").removeprefix("models/")
            for m in self.cliente().models.list()
            if "generateContent" in (m.supported_actions or [])
        )
