@echo off
setlocal EnableExtensions
cd /d "%~dp0\..\.."

if /i "%~1"=="local" goto :local
if /i "%~1"=="--local" goto :local

where gh >nul 2>&1
if errorlevel 1 (
	echo Instale o GitHub CLI ^(gh^) para disparar o workflow.
	echo Ou abra: GitHub - Actions - PDV instalador - Run workflow
	echo.
	echo Para gerar neste computador: %~nx0 local
	exit /b 1
)

for /f "delims=" %%i in ('git branch --show-current 2^>nul') do set "BRANCH=%%i"
if not defined BRANCH set "BRANCH=main"

echo Disparando workflow "PDV instalador" na branch %BRANCH%...
gh workflow run "PDV instalador" --ref "%BRANCH%"
if errorlevel 1 exit /b 1

echo Aguardando o run iniciar...
timeout /t 4 /nobreak >nul

set "RUN_ID="
for /f "delims=" %%i in ('gh run list --workflow "PDV instalador" --limit 1 --json databaseId --jq ".[0].databaseId"') do set "RUN_ID=%%i"
if not defined RUN_ID (
	echo Nao foi possivel obter o run. Acompanhe em GitHub - Actions.
	exit /b 1
)

echo Acompanhando run %RUN_ID%...
gh run watch %RUN_ID%
if errorlevel 1 exit /b 1

if not exist "pdv\release" mkdir "pdv\release"
gh run download %RUN_ID% --dir "pdv\release"
echo Artefatos baixados em pdv\release
exit /b 0

:local
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-instalador.ps1"
exit /b %ERRORLEVEL%
