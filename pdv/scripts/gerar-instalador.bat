@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

if /i "%~1"=="local" (
	powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-instalador.ps1"
	exit /b %ERRORLEVEL%
)
if /i "%~1"=="--local" (
	powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-instalador.ps1"
	exit /b %ERRORLEVEL%
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-instalador.ps1" -Dispatch
exit /b %ERRORLEVEL%
