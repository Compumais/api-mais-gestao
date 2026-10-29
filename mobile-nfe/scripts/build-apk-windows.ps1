# Build release APK no Windows (caminho curto + limpeza CMake).
# Uso: .\scripts\build-apk-windows.ps1
# Requer: ANDROID_HOME, Node, JDK, projeto em pasta SEM acentos (ex.: C:\mnfe).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$root\android\gradlew.bat")) {
	Write-Error "Execute na raiz do mobile-nfe (com pasta android). Raiz detectada: $root"
}

$env:ANDROID_HOME = $env:ANDROID_HOME ?? "$env:LOCALAPPDATA\Android\Sdk"
$localProps = "$root\android\local.properties"
"sdk.dir=$($env:ANDROID_HOME -replace '\\','/')" | Set-Content -Encoding ascii $localProps

Remove-Item -Recurse -Force "$root\android\app\.cxx" -ErrorAction SilentlyContinue

Push-Location "$root\android"
try {
	.\gradlew.bat clean assembleRelease -PreactNativeArchitectures=arm64-v8a
	$apk = "$root\android\app\build\outputs\apk\release\app-release.apk"
	if (Test-Path $apk) {
		Write-Host "APK: $apk"
	}
} finally {
	Pop-Location
}
