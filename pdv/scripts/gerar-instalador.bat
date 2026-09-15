@echo off
setlocal EnableExtensions
title PDV Mais Gestao - Gerar instalador

pushd "%~dp0..\.."
if errorlevel 1 (
	echo Nao foi possivel abrir a pasta do repositorio.
	echo.
	pause
	exit /b 1
)

where powershell >nul 2>&1
if errorlevel 1 (
	echo PowerShell nao encontrado. Instale o Windows PowerShell 5.1.
	echo.
	pause
	popd
	exit /b 1
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
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-instalador.ps1"
goto :done

:dispatch
echo.
echo Disparando GitHub Actions...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-instalador.ps1" -Dispatch
goto :done

:cancel
set "ERR=0"
goto :end

:done
set "ERR=%ERRORLEVEL%"

:end
echo.
if not "%ERR%"=="0" if not "%ERR%"=="" echo Falhou com codigo %ERR%.
echo.
pause
popd
if "%ERR%"=="" exit /b 0
exit /b %ERR%
