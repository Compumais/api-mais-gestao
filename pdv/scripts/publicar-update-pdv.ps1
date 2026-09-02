#Requires -Version 5.1
<#
.SYNOPSIS
	Publica version.json e o Setup.exe do PDV na VPS (/opt/mais-gestao/pdv-updates).

.EXAMPLE
	.\publicar-update-pdv.ps1 -HostName api.compuchat.space -User deploy
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

Write-Host "Enviando $artifact e version.json para ${sshTarget}:$RemoteDir ..."
& scp @scpArgs $manifestPath $setupPath "${sshTarget}:${RemoteDir}/"
if ($LASTEXITCODE -ne 0) {
	throw "scp falhou com codigo $LASTEXITCODE"
}

Write-Host "Publicado:"
Write-Host "  https://$HostName/pdv/updates/version.json"
Write-Host "  https://$HostName/pdv/updates/$artifact"
Write-Host ""
Write-Host "Confirme o location /pdv/updates/ no Nginx e recarregue se acabou de alterar a config:"
Write-Host "  sudo nginx -t && sudo systemctl reload nginx"
