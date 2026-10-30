#Requires -Version 5.1
<#
.SYNOPSIS
  Gera o APK debug do Mais Gestão NFe.

  Saída: build\apk\Mais-Gestao-NFe-<versão>.apk
#>
$ErrorActionPreference = "Stop"

$src = $PSScriptRoot
$sdk = $env:ANDROID_HOME
if (-not $sdk) {
	$sdk = $env:ANDROID_SDK_ROOT
}
if (-not $sdk) {
	$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
}
$localProps = Join-Path $src "local.properties"
if (-not (Test-Path -LiteralPath $sdk) -and (Test-Path -LiteralPath $localProps)) {
	$linha = Get-Content -LiteralPath $localProps | Where-Object { $_ -match '^\s*sdk\.dir\s*=\s*(.+)\s*$' } | Select-Object -First 1
	if ($linha -match '^\s*sdk\.dir\s*=\s*(.+)\s*$') {
		$sdk = $Matches[1].Trim().Replace('\\', '\').Replace('\:', ':')
	}
}
if (-not (Test-Path -LiteralPath $sdk)) {
	throw "Android SDK nao encontrado. Defina ANDROID_HOME ou sdk.dir em local.properties."
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$(Join-Path $sdk 'platform-tools');$env:Path"

$gradle = Get-Content -LiteralPath (Join-Path $src "app\build.gradle.kts") -Raw
$versao = "debug"
if ($gradle -match 'versionName\s*=\s*"([^"]+)"') {
	$versao = $Matches[1].Trim()
}

Write-Host "Gerando APK debug do Mais Gestao NFe $versao ..."
Push-Location $src
try {
	& .\gradlew.bat assembleDebug
	if ($LASTEXITCODE -ne 0) {
		throw "gradlew assembleDebug falhou com codigo $LASTEXITCODE"
	}
} finally {
	Pop-Location
}

$apk = Join-Path $src "app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path -LiteralPath $apk)) {
	throw "APK nao gerado em $apk"
}

$outDir = Join-Path $src "build\apk"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$destApk = Join-Path $outDir "Mais-Gestao-NFe-$versao.apk"
Copy-Item -LiteralPath $apk -Destination $destApk -Force

Write-Host ""
Write-Host "APK gerado:"
Write-Host "  $destApk"
Get-Item -LiteralPath $destApk | Format-List FullName, Length, LastWriteTime
