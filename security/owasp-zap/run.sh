#!/usr/bin/env bash
#
# Roda uma análise do OWASP ZAP (baseline ou full scan) contra uma API local.
# Usa a instalação local do ZAP (zap.sh) em modo de linha de comando.
# Não depende de Docker.
#
# Uso:
#   ./run.sh [URL] [MODE]
#
#   URL   - URL da API a analisar (padrão: http://localhost:3000/api/docs
#           — a raiz "/" retorna 404, pois o Nest usa prefixo global /api)
#   MODE  - baseline (padrão, rápido, passivo) ou full (ativo, mais demorado
#           e mais intrusivo — só use contra ambiente próprio)
#
# Exemplos:
#   ./run.sh
#   ./run.sh http://localhost:3000/api/docs full

set -euo pipefail

URL="${1:-http://localhost:3000/api/docs}"
MODE="${2:-baseline}"

if [[ "$MODE" != "baseline" && "$MODE" != "full" ]]; then
  echo "MODE inválido: $MODE (use 'baseline' ou 'full')" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="$SCRIPT_DIR/reports"
mkdir -p "$REPORTS_DIR"

# Localiza o zap.sh: PATH > locais comuns de instalação (Linux/macOS).
find_zap() {
  if command -v zap.sh >/dev/null 2>&1; then
    command -v zap.sh
    return
  fi

  local candidates=(
    "/usr/share/zaproxy/zap.sh"
    "/opt/zaproxy/zap.sh"
    "/Applications/ZAP.app/Contents/Java/zap.sh"
    "$HOME/ZAP_*/zap.sh"
  )

  for c in "${candidates[@]}"; do
    for f in $c; do
      if [[ -f "$f" ]]; then
        echo "$f"
        return
      fi
    done
  done
}

ZAP_BIN="$(find_zap || true)"

if [[ -z "$ZAP_BIN" ]]; then
  echo "ERRO: zap.sh não encontrado." >&2
  echo "Instale o OWASP ZAP (https://www.zaproxy.org/download/) e garanta que zap.sh esteja no PATH," >&2
  echo "ou exporte ZAP_BIN=/caminho/para/zap.sh antes de rodar este script." >&2
  exit 1
fi

echo "ZAP encontrado em: $ZAP_BIN"
echo "Alvo: $URL"
echo "Modo: $MODE"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_HTML="$REPORTS_DIR/zap-$MODE-$TIMESTAMP.html"
LOG_FILE="$REPORTS_DIR/zap-$MODE-$TIMESTAMP.log"

ZAP_ARGS=(-cmd -quickurl "$URL" -quickout "$REPORT_HTML" -quickprogress)

if [[ "$MODE" == "full" ]]; then
  # Ativa também ataques ativos (fuzzing de parâmetros, etc). Mais lento e
  # mais intrusivo: use só contra o próprio ambiente de desenvolvimento.
  ZAP_ARGS+=(-quickattack)
fi

echo "Executando ZAP (isso pode levar alguns minutos)..."
"$ZAP_BIN" "${ZAP_ARGS[@]}" > "$LOG_FILE" 2>&1 || true

if [[ -f "$REPORT_HTML" ]]; then
  echo "Relatório HTML: $REPORT_HTML"
else
  echo "Relatório HTML não foi gerado. Veja o log: $LOG_FILE"
fi

echo "Log completo: $LOG_FILE"
