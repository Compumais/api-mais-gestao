#Requires -Version 5.1
param(
	[switch]$Bump,
	[switch]$NoBump
)

$ErrorActionPreference = "Stop"

$installerDir = $PSScriptRoot
$iss = Join-Path $installerDir "pdv-mais-gestao.iss"
$unpacked = [System.IO.Path]::GetFullPath((Join-Path $installerDir "..\release\win-unpacked"))
$bumpScript = [System.IO.Path]::GetFullPath((Join-Path $installerDir "..\scripts\bump-versao-instalador.ps1"))

. $bumpScript

if ($Bump -and -not $NoBump) {
	Invoke-BumpVersaoInstalador | Out-Null
}

if (-not (Test-Path $iss)) {
	throw "Script Inno Setup nao encontrado: $iss"
}

$exe = Get-ChildItem -Path $unpacked -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $exe) {
	throw "App empacotado nao encontrado em release\win-unpacked. Rode antes: npm run pack:dir"
}

$isccCandidates = @(
	"${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
	"${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
	"${env:LocalAppData}\Programs\Inno Setup 6\ISCC.exe",
	"${env:ProgramFiles}\Inno Setup 7\ISCC.exe",
	"${env:ProgramFiles(x86)}\Inno Setup 7\ISCC.exe",
	"${env:LocalAppData}\Programs\Inno Setup 7\ISCC.exe"
)
$isccCmd = Get-Command "iscc" -ErrorAction SilentlyContinue
if ($isccCmd) {
	$isccCandidates = @($isccCmd.Source) + $isccCandidates
}

$iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
	Write-Host @"
Inno Setup 6 nao encontrado.

Instale com:
  winget install --id JRSoftware.InnoSetup -e --accept-package-agreements --accept-source-agreements

Depois rode de novo:
  npm run pack:iss

Opcional (instalador offline, sem download na maquina do cliente):
  baixe PostgreSQL 17 Windows x64 em
  https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
  e salve como:
  pdv\installer\vendor\postgresql-17-windows-x64.exe
"@
	exit 1
}

Write-Host "Compilando $iss com $iscc"
$versao = Get-VersaoPackageJson
Write-Host "Versao do PDV: $versao"
& $iscc "/DMyAppVersion=$versao" $iss
if ($LASTEXITCODE -ne 0) {
	throw "ISCC falhou com codigo $LASTEXITCODE"
}

Write-VersionJson -Version $versao

$output = Join-Path $installerDir "output"
Write-Host "Instalador gerado em: $output"
Get-ChildItem $output -Filter "*.exe" | ForEach-Object { Write-Host " - $($_.FullName)" }
