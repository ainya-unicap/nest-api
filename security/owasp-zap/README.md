# OWASP ZAP

Análise dinâmica de segurança (DAST) contra a API rodando localmente, em
`http://localhost:3000/api/docs` por padrão. Diferente do SonarQube (que lê o código
sem executá-lo), o ZAP manda requisições reais contra a API em execução e
observa as respostas, então **a API precisa estar rodando** (`npm run dev`)
antes de iniciar a análise.

Usa a instalação local oficial do ZAP, sem Docker.

## O que é o OWASP ZAP

O OWASP Zed Attack Proxy é um scanner de segurança de aplicações web mantido
pela OWASP, gratuito e open source. Ele age como um proxy entre o cliente e a
API: intercepta requisições, procura por vulnerabilidades conhecidas (SQL
Injection, XSS, cabeçalhos de segurança ausentes, cookies mal configurados,
exposição de informações sensíveis, etc.) e gera um relatório com os achados.

## Para que serve

Serve para encontrar falhas de segurança na API antes que cheguem à produção:
cabeçalhos ausentes (`X-Content-Type-Options`, `Content-Security-Policy`),
CORS aberto demais, mensagens de erro que vazam detalhes internos, endpoints
sem autenticação que deveriam ser protegidos, entre outros. É um teste
complementar ao SonarQube: o Sonar olha o código-fonte, o ZAP olha o
comportamento da API em execução.

## Como instalar

1. Baixe o instalador para o seu sistema em
   https://www.zaproxy.org/download/
2. Instale normalmente (Windows: `.exe`; macOS: `.dmg`; Linux: pacote ou
   `.tar.gz`).
3. Confirme que o executável de linha de comando existe:
   - Windows: `zap.bat`, dentro da pasta de instalação
     (ex.: `C:\Program Files\ZAP\Zed Attack Proxy\zap.bat`)
   - Linux/macOS: `zap.sh`
4. Os scripts desta pasta procuram o executável automaticamente no PATH e nos
   locais padrão de instalação. Se não encontrarem, veja a seção
   "Não encontrou o ZAP?" abaixo.

Não é preciso instalar nada em Python/Node para isso — o ZAP é um programa
Java completo, autocontido.

## Como executar uma análise em uma API local

1. Suba a API em outro terminal:

   ```bash
   npm run dev
   ```

2. Rode o scan:

   **Windows (PowerShell):**
   ```powershell
   cd security/owasp-zap
   ./run.ps1 -Url http://localhost:3000/api/docs
   ```

   **Linux/macOS:**
   ```bash
   cd security/owasp-zap
   ./run.sh http://localhost:3000/api/docs
   ```

   Sem argumentos, os dois scripts usam `http://localhost:3000/api/docs` por padrão.

3. Existem dois modos:
   - **`baseline`** (padrão): só passivo, não tenta explorar nada, apenas
     observa o tráfego. Rápido e seguro.
   - **`full`**: também faz ataques ativos (envia payloads de SQLi, XSS etc.
     contra os endpoints encontrados). Mais demorado e mais intrusivo —
     **use só contra o seu próprio ambiente de desenvolvimento**, nunca contra
     uma API de terceiros ou em produção.

   ```powershell
   ./run.ps1 -Url http://localhost:3000/api/docs -Mode full
   ```
   ```bash
   ./run.sh http://localhost:3000/api/docs full
   ```

### Como interromper o teste

- No modo `baseline`, o scan termina sozinho em poucos segundos/minutos.
- No modo `full`, pode demorar bem mais (minutos a dezenas de minutos,
  dependendo do número de endpoints). Para interromper antes do fim, feche o
  terminal ou pressione `Ctrl+C` — o ZAP encerra o processo e o relatório
  parcial, se já tiver sido gerado, fica em `reports/`.

## Como gerar e localizar os relatórios

Cada execução salva, dentro de `security/owasp-zap/reports/`:

- `zap-<modo>-<data-hora>.html` — relatório legível, para abrir no navegador.
- `zap-<modo>-<data-hora>.log` — saída completa do ZAP (útil se o relatório
  não for gerado, para ver o motivo).

Os relatórios não são apagados entre execuções, então dá para comparar scans
ao longo do tempo.

## Como interpretar os principais alertas

O relatório agrupa os achados por risco:

- **High** — vulnerabilidade séria (ex.: SQL Injection confirmado). Corrigir
  antes de qualquer deploy.
- **Medium** — risco real, mas que normalmente exige outra condição para ser
  explorado (ex.: cabeçalho de segurança ausente). Vale corrigir.
- **Low** — boas práticas (ex.: versão do servidor exposta no header). Baixo
  risco, mas fácil de corrigir.
- **Informational** — apenas observações, sem risco de segurança direto.

Cada alerta no HTML traz: a URL afetada, a descrição do problema, uma
evidência (o trecho da resposta que disparou o alerta) e uma seção "Solution"
com a recomendação de correção. Comece sempre pelos alertas **High**, depois
**Medium**.

## Não encontrou o ZAP?

Se os scripts não localizarem o executável automaticamente:

- **Windows:** passe o caminho explícito: `./run.ps1 -ZapPath "C:\caminho\para\zap.bat"`
- **Linux/macOS:** adicione a pasta de instalação ao PATH, ou edite a
  variável `ZAP_BIN` diretamente em `run.sh`.

## Arquivos desta pasta

| arquivo | função |
|---|---|
| `README.md` | este documento |
| `run.ps1` | script de execução para Windows (PowerShell) |
| `run.sh` | script de execução para Linux/macOS |
| `reports/` | relatórios HTML e logs gerados a cada execução |

Nenhum arquivo fora de `security/owasp-zap/` foi alterado.

## Exemplo completo

Com a API rodando em `http://localhost:3000/api/docs`:

```powershell
# Windows
cd security/owasp-zap
./run.ps1 -Url http://localhost:3000/api/docs
```

```bash
# Linux/macOS
cd security/owasp-zap
./run.sh http://localhost:3000/api/docs
```

Saída esperada:

```
ZAP encontrado em: C:\Program Files\ZAP\Zed Attack Proxy\zap.bat
Alvo: http://localhost:3000/api/docs
Modo: baseline
Executando ZAP (isso pode levar alguns minutos)...
Relatório HTML: security/owasp-zap/reports/zap-baseline-20260930-143200.html
Log completo: security/owasp-zap/reports/zap-baseline-20260930-143200.log
```

Abra o `.html` gerado no navegador para ver os alertas encontrados.
