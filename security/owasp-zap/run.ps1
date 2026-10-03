<#
.SYNOPSIS
    Roda uma análise do OWASP ZAP (baseline ou full scan) contra uma API local.

.DESCRIPTION
    Usa a instalação local do ZAP (zap.bat) em modo de linha de comando para
    escanear a URL informada e salvar o relatório em security/owasp-zap/reports.
    Não depende de Docker.

.PARAMETER Url
    URL da API a analisar. Padrão: http://localhost:3000/api/docs
    A raiz (/) retorna 404 — o Nest usa prefixo global /api — então aponte
    para /api/docs (Swagger) ou outro endpoint real para o ZAP ter o que
    rastrear.

.PARAMETER Mode
    "baseline" (padrão, rápido, passivo) ou "full" (ativo, mais demorado e mais
    intrusivo — só use contra ambiente próprio, nunca contra terceiros).

.PARAMETER ZapPath
    Caminho para zap.bat, caso não esteja no PATH nem na pasta padrão de instalação.

.EXAMPLE
    ./run.ps1 -Url http://localhost:3000

.EXAMPLE
    ./run.ps1 -Url http://localhost:3000 -Mode full
#>

param(
    [string]$Url = "http://localhost:3000/api/docs",
    [ValidateSet("baseline", "full")]
    [string]$Mode = "baseline",
    [string]$ZapPath = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$reportsDir = Join-Path $scriptDir "reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

# Localiza o zap.bat: parâmetro explícito > PATH > instalação padrão do Windows.
function Find-Zap {
    param([string]$Explicit)

    if ($Explicit -and (Test-Path $Explicit)) {
        return $Explicit
    }

    $inPath = Get-Command "zap.bat" -ErrorAction SilentlyContinue
    if ($inPath) {
        return $inPath.Source
    }

    $candidates = @(
        "$env:ProgramFiles\ZAP\Zed Attack Proxy\zap.bat",
        "${env:ProgramFiles(x86)}\ZAP\Zed Attack Proxy\zap.bat",
        "$env:LOCALAPPDATA\Programs\ZAP\Zed Attack Proxy\zap.bat"
    )

    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) {
            return $c
        }
    }

    return $null
}

$zapBat = Find-Zap -Explicit $ZapPath

if (-not $zapBat) {
    Write-Host "ERRO: zap.bat não encontrado." -ForegroundColor Red
    Write-Host "Instale o OWASP ZAP (https://www.zaproxy.org/download/) ou informe o caminho com -ZapPath."
    exit 1
}

Write-Host "ZAP encontrado em: $zapBat"
Write-Host "Alvo: $Url"
Write-Host "Modo: $Mode"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportHtml = Join-Path $reportsDir "zap-$Mode-$timestamp.html"
$reportJson = Join-Path $reportsDir "zap-$Mode-$timestamp.json"
$logFile = Join-Path $reportsDir "zap-$Mode-$timestamp.log"

# -cmd roda o ZAP sem interface gráfica.
# quick-out gera o HTML; -J adiciona o JSON junto.
$zapArgs = @(
    "-cmd",
    "-quickurl", $Url,
    "-quickout", $reportHtml,
    "-quickprogress"
)

if ($Mode -eq "full") {
    # Ativa também ataques ativos (fuzzing de parâmetros, etc). Mais lento e
    # mais intrusivo: use só contra o próprio ambiente de desenvolvimento.
    $zapArgs += "-quickattack"
}

Write-Host "Executando ZAP (isso pode levar alguns minutos)..."

# zap.bat referencia o .jar por caminho relativo, então precisa ser chamado
# com o diretório de trabalho dentro da própria pasta de instalação.
$zapDir = Split-Path -Parent $zapBat
Push-Location $zapDir
# O ZAP escreve warnings do Java no stderr mesmo em execuções normais; sem isto
# o PowerShell 5.1 trata essas linhas como erro terminante (NativeCommandError)
# e aborta o script mesmo quando o scan terminou com sucesso.
$previousEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    & $zapBat @zapArgs *> $logFile
} finally {
    $ErrorActionPreference = $previousEap
    Pop-Location
}

if (Test-Path $reportHtml) {
    Write-Host "Relatório HTML: $reportHtml" -ForegroundColor Green
} else {
    Write-Host "Relatório HTML não foi gerado. Veja o log: $logFile" -ForegroundColor Yellow
}

Write-Host "Log completo: $logFile"
