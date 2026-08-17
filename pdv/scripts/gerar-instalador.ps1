#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$pdvDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
Set-Location $pdvDir

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

Write-Host "Instalando dependencias..."
npm ci
if ($LASTEXITCODE -ne 0) {
	throw "npm ci falhou com codigo $LASTEXITCODE"
}

Write-Host "Gerando executavel e instalador NSIS..."
npm run pack:win
if ($LASTEXITCODE -ne 0) {
	throw "pack:win falhou com codigo $LASTEXITCODE"
}

Write-Host "Compilando instalador Inno Setup..."
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $pdvDir "installer\compilar-iss.ps1")
if ($LASTEXITCODE -ne 0) {
	throw "compilar-iss.ps1 falhou com codigo $LASTEXITCODE"
}

$zip = Join-Path $pdvDir "release\PDV-Mais-Gestao-portable.zip"
if (Test-Path $zip) {
	Remove-Item $zip -Force
}
Compress-Archive -Path (Join-Path $pdvDir "release\win-unpacked\*") -DestinationPath $zip -Force

Write-Host ""
Write-Host "Pacotes gerados:"
Get-ChildItem (Join-Path $pdvDir "release") -Include "*.exe", "*.zip" -File -ErrorAction SilentlyContinue |
	ForEach-Object { Write-Host " - $($_.FullName)" }
Get-ChildItem (Join-Path $pdvDir "installer\output") -Filter "*.exe" -ErrorAction SilentlyContinue |
	ForEach-Object { Write-Host " - $($_.FullName)" }
