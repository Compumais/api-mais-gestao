@echo off
setlocal EnableExtensions DisableDelayedExpansion
title PDV Mais Gestao - Gerar instalador
chcp 65001 >nul

set "ERR=0"
set "PAUSE_AT_END=1"
if not "%~1"=="" set "PAUSE_AT_END=0"

pushd "%~dp0..\.."
if errorlevel 1 (
	echo Nao foi possivel abrir a pasta do repositorio.
	set "ERR=1"
	goto :end
)

where powershell >nul 2>&1
if errorlevel 1 (
	echo PowerShell nao encontrado. Instale o Windows PowerShell 5.1.
	set "ERR=1"
	goto :end
)

if /i "%~1"=="local" goto :local
if /i "%~1"=="--local" goto :local
if /i "%~1"=="github" goto :dispatch
if /i "%~1"=="--github" goto :dispatch
if /i "%~1"=="dispatch" goto :dispatch

echo.
echo  PDV Mais Gestao - Gerar instalador
echo.
echo  1. Gerar neste computador (Node + Inno Setup)
echo  2. Disparar GitHub Actions (precisa do gh)
echo  3. Sair
echo.
choice /c 123 /n /m "Escolha uma opcao: "
if errorlevel 3 goto :cancel
if errorlevel 2 goto :dispatch
if errorlevel 1 goto :local
goto :cancel

:local
echo.
echo Gerando instalador neste computador...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-instalador.ps1"
goto :done

:dispatch
echo.
echo Disparando GitHub Actions...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-instalador.ps1" -Dispatch
goto :done

:cancel
set "ERR=0"
goto :end

:done
set "ERR=%ERRORLEVEL%"

:end
echo.
if not "%ERR%"=="0" echo Falhou com codigo %ERR%.
echo.
if "%PAUSE_AT_END%"=="1" pause
popd >nul 2>&1
exit /b %ERR%
