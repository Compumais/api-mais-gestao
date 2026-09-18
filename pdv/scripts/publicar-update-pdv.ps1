#Requires -Version 5.1
<#
.SYNOPSIS
	Publica version.json e o Setup.exe do PDV na VPS (/opt/mais-gestao/pdv-updates).

.EXAMPLE
	.\publicar-update-pdv.ps1 -HostName apimaisgestao.compumais.com -User deploy
#>
param(
	[Parameter(Mandatory = $true)]
	[string]$HostName,
	[string]$User = "deploy",
	[string]$RemoteDir = "/opt/mais-gestao/pdv-updates",
	[string]$IdentityFile
)

$ErrorActionPreference = "Stop"

$pdvDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$outputDir = Join-Path $pdvDir "installer\output"
$manifestPath = Join-Path $outputDir "version.json"

if (-not (Test-Path -LiteralPath $manifestPath)) {
	throw "Manifesto nao encontrado: $manifestPath. Gere o instalador antes (npm run pack:release)."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$artifact = [string]$manifest.artifact
if (-not $artifact) {
	throw "version.json sem campo artifact"
}
$setupPath = Join-Path $outputDir $artifact
if (-not (Test-Path -LiteralPath $setupPath)) {
	throw "Setup nao encontrado: $setupPath"
}
$sha256 = [string]$manifest.sha256
$size = [long]$manifest.size
$setup = Get-Item -LiteralPath $setupPath
if (-not $sha256 -or $sha256 -notmatch '^[a-fA-F0-9]{64}$') {
	throw "version.json sem sha256 valido"
}
if ($size -le 0 -or $setup.Length -ne $size) {
	throw "Tamanho do Setup diverge do manifesto: arquivo=$($setup.Length), manifesto=$size"
}
$hashLocal = (Get-FileHash -LiteralPath $setupPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($hashLocal -ne $sha256.ToLowerInvariant()) {
	throw "SHA-256 do Setup diverge do manifesto"
}

$sshTarget = "{0}@{1}" -f $User, $HostName
$scpArgs = @()
$sshArgs = @()
if ($IdentityFile) {
	$scpArgs += @("-i", $IdentityFile)
	$sshArgs += @("-i", $IdentityFile)
}

Write-Host "Criando diretorio remoto $RemoteDir ..."
& ssh @sshArgs $sshTarget "mkdir -p $RemoteDir"
if ($LASTEXITCODE -ne 0) {
	throw "ssh mkdir falhou com codigo $LASTEXITCODE"
}

Write-Host "Enviando $artifact para ${sshTarget}:$RemoteDir ..."
& scp @scpArgs $setupPath "${sshTarget}:${RemoteDir}/${artifact}.tmp"
if ($LASTEXITCODE -ne 0) {
	throw "scp do Setup falhou com codigo $LASTEXITCODE"
}
& ssh @sshArgs $sshTarget "set -e; test `"`$(stat -c%s '$RemoteDir/${artifact}.tmp')`" = '$size'; test `"`$(sha256sum '$RemoteDir/${artifact}.tmp' | cut -d' ' -f1)`" = '$($sha256.ToLowerInvariant())'; chmod 0644 '$RemoteDir/${artifact}.tmp'; mv -f '$RemoteDir/${artifact}.tmp' '$RemoteDir/$artifact'"
if ($LASTEXITCODE -ne 0) {
	throw "validacao remota do Setup falhou com codigo $LASTEXITCODE"
}

Write-Host "Ativando version.json por ultimo ..."
& scp @scpArgs $manifestPath "${sshTarget}:${RemoteDir}/version.json.tmp"
if ($LASTEXITCODE -ne 0) {
	throw "scp do manifesto falhou com codigo $LASTEXITCODE"
}
& ssh @sshArgs $sshTarget "set -e; chmod 0644 '$RemoteDir/version.json.tmp'; mv -f '$RemoteDir/version.json.tmp' '$RemoteDir/version.json'; find '$RemoteDir' -maxdepth 1 -type f -name 'PDV-Mais-Gestao-Setup-*.exe' ! -name '$artifact' -delete"
if ($LASTEXITCODE -ne 0) {
	throw "ativacao remota do manifesto falhou com codigo $LASTEXITCODE"
}

Write-Host "Publicado:"
Write-Host "  https://$HostName/pdv/updates/version.json"
Write-Host "  https://$HostName/pdv/updates/$artifact"
Write-Host ""
Write-Host "IMPORTANTE: version.json e o Setup.exe devem ficar juntos em $RemoteDir."
Write-Host "A API so anuncia a versao se o artefato existir na mesma pasta (evita HTTP 404 no PDV)."
Write-Host "A API Fastify serve /pdv/updates/ (PDV_UPDATES_PATH=$RemoteDir)."
Write-Host "Nginx faz proxy de /pdv/updates/ para a API; reinicie/deploy a API apos atualizar o manifesto embutido."
Write-Host "Opcional: sudo nginx -t && sudo systemctl reload nginx"
