from groq import APIStatusError, Groq, RateLimitError

from core.erros import FalhaNoModelo, LimiteDeUso
from llm.base import ProvedorLLM, RespostaLLM


class GroqLLM(ProvedorLLM):
    nome = "groq"
    variavel_chave = "GROQ_API_KEY"

    def _criar_cliente(self) -> Groq:
        return Groq(api_key=self.cfg.api_key)

    def gerar_json(self, mensagens: list[dict]) -> RespostaLLM:
        # Fora do try: o 503 de "chave não configurada" precisa chegar assim ao Nest,
        # em vez de virar um 502 genérico de "falha ao chamar a Groq".
        groq = self.cliente()
        try:
            resposta = groq.chat.completions.create(
                model=self.cfg.modelo,
                messages=mensagens,
                # JSON mode: garante objeto válido em vez de texto com crases em volta.
                response_format={"type": "json_object"},
                temperature=self.cfg.temperatura,
                max_tokens=self.cfg.max_tokens,
                # O SDK desta versão não tem o parâmetro nomeado; a API aceita.
                extra_body=(
                    {"reasoning_effort": self.cfg.esforco_raciocinio}
                    if self.cfg.esforco_raciocinio
                    else None
                ),
            )
        except RateLimitError as e:
            raise LimiteDeUso(f"Limite de uso da Groq atingido: {e}") from e
        except APIStatusError as e:
            # A Groq devolve 413 quando entrada + max_tokens passa do limite por minuto.
            if e.status_code == 413:
                raise LimiteDeUso(
                    f"Pedido maior que o limite de tokens por minuto da Groq "
                    f"(reduza GROQ_MAX_TOKENS): {e}"
                ) from e
            raise FalhaNoModelo(f"Groq respondeu {e.status_code}: {e}") from e
        except Exception as e:  # rede, DNS, chave inválida
            raise FalhaNoModelo(f"Falha ao chamar a Groq: {e}") from e

        uso = resposta.usage
        return RespostaLLM(
            conteudo=resposta.choices[0].message.content or "",
            modelo=resposta.model,
            tokens_entrada=getattr(uso, "prompt_tokens", 0) or 0,
            tokens_saida=getattr(uso, "completion_tokens", 0) or 0,
        )

    def listar_modelos(self) -> list[str]:
        return sorted(m.id for m in self.cliente().models.list().data)
