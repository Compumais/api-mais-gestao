#Requires -Version 5.1
<#
.SYNOPSIS
  Gera o APK release da Estação Balança.

  Copia o projeto para um path sem acento (Flutter AOT quebra em "mais gestão"),
  faz o build e copia o APK para build\apk\.
#>
$ErrorActionPreference = "Stop"

$src = $PSScriptRoot
$dst = Join-Path $env:USERPROFILE "Documents\DEV\estacao-balanca-apk"
$flutterBin = Join-Path $env:USERPROFILE "flutter\bin"
$env:Path = "$flutterBin;$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:Path"
$env:CI = "true"
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

if (Test-Path -LiteralPath $dst) {
	Remove-Item -LiteralPath $dst -Recurse -Force
}
New-Item -ItemType Directory -Path $dst | Out-Null

Write-Host "Copiando projeto para $dst ..."
& robocopy $src $dst /E /XD build .dart_tool .idea android\.gradle android\app\build /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) {
	throw "robocopy falhou com codigo $LASTEXITCODE"
}

Push-Location $dst
try {
	flutter pub get
	flutter build apk --release --android-skip-build-dependency-validation
} finally {
	Pop-Location
}

$apk = Join-Path $dst "build\app\outputs\flutter-apk\app-release.apk"
if (-not (Test-Path -LiteralPath $apk)) {
	throw "APK nao gerado em $apk"
}

$outDir = Join-Path $src "build\apk"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$version = (Get-Content (Join-Path $src "pubspec.yaml") | Where-Object { $_ -match '^version:\s*(.+)$' } | ForEach-Object { $Matches[1].Trim() })
$nameVersion = ($version -split '\+')[0]
$destApk = Join-Path $outDir "Estacao-Balanca-$nameVersion.apk"
Copy-Item -LiteralPath $apk -Destination $destApk -Force

Write-Host ""
Write-Host "APK gerado:"
Write-Host "  $destApk"
Get-Item -LiteralPath $destApk | Format-List FullName, Length, LastWriteTime
