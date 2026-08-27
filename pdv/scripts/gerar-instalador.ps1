#Requires -Version 5.1
param(
	[Parameter(Position = 0)]
	[string]$Modo,
	[switch]$Dispatch
)

$ErrorActionPreference = "Stop"

function Test-GhDisponivel {
	return [bool](Get-Command gh -ErrorAction SilentlyContinue)
}

function Invoke-Dispatch {
	$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
	Set-Location $repoRoot

	if (-not (Test-GhDisponivel)) {
		Write-Host "Instale o GitHub CLI (gh) para disparar o workflow."
		Write-Host "Ou abra: GitHub - Actions - PDV instalador - Run workflow"
		Write-Host ""
		Write-Host "Para gerar neste computador: scripts\gerar-instalador.bat local"
		exit 1
	}

	gh auth status 2>&1 | Out-Null
	if ($LASTEXITCODE -ne 0) {
		Write-Host "GitHub CLI nao autenticado. Rode: gh auth login"
		exit 1
	}

	$branch = (git branch --show-current 2>$null)
	if (-not $branch) {
		$branch = "main"
	}

	git ls-remote --exit-code --heads origin $branch 2>$null | Out-Null
	if ($LASTEXITCODE -ne 0) {
		Write-Host "A branch '$branch' nao existe no GitHub. Envie com: git push -u origin $branch"
		exit 1
	}

	$ahead = 0
	git rev-parse --verify "origin/$branch" 2>$null | Out-Null
	if ($LASTEXITCODE -eq 0) {
		$ahead = [int](git rev-list --count "origin/$branch..HEAD" 2>$null)
	}
	if ($ahead -gt 0) {
		Write-Host "Aviso: ha $ahead commit(s) local(is) nao enviado(s). O instalador usara o que esta no GitHub."
	}

	Write-Host "Disparando workflow 'PDV instalador' na branch $branch..."
	gh workflow run "PDV instalador" --ref $branch
	if ($LASTEXITCODE -ne 0) {
		exit $LASTEXITCODE
	}

	Write-Host "Aguardando o run iniciar..."
	$runId = $null
	for ($i = 0; $i -lt 15; $i++) {
		Start-Sleep -Seconds 4
		$runId = gh run list --workflow "PDV instalador" --branch $branch --limit 1 --json databaseId --jq ".[0].databaseId" 2>$null
		if ($runId) {
			break
		}
	}
	if (-not $runId) {
		Write-Host "Nao foi possivel obter o run. Acompanhe em GitHub - Actions."
		exit 1
	}

	Write-Host "Acompanhando run $runId..."
	gh run watch $runId --exit-status
	if ($LASTEXITCODE -ne 0) {
		Write-Host "O workflow falhou. Veja: gh run view $runId --log"
		exit $LASTEXITCODE
	}

	$dest = Join-Path $repoRoot "pdv\release"
	New-Item -ItemType Directory -Force -Path $dest | Out-Null
	gh run download $runId --dir $dest
	Write-Host "Artefatos baixados em pdv\release"
}

function Invoke-Local {
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
	Get-ChildItem (Join-Path $pdvDir "release\*") -Include "*.exe", "*.zip" -File -ErrorAction SilentlyContinue |
		ForEach-Object { Write-Host " - $($_.FullName)" }
	Get-ChildItem (Join-Path $pdvDir "installer\output") -Filter "*.exe" -ErrorAction SilentlyContinue |
		ForEach-Object { Write-Host " - $($_.FullName)" }
}

$modoNorm = if ($Modo) { $Modo.Trim().ToLower() } else { "" }
$isDispatch = $Dispatch -or ($modoNorm -in @("github", "--github", "dispatch"))
if ($isDispatch) {
	Invoke-Dispatch
	exit 0
}

Invoke-Local
