#Requires -Version 5.1
param(
	[Parameter(Position = 0)]
	[string]$Modo,
	[switch]$Dispatch
)

$ErrorActionPreference = "Stop"

try {
	$utf8 = New-Object System.Text.UTF8Encoding $false
	[Console]::InputEncoding = $utf8
	[Console]::OutputEncoding = $utf8
	$global:OutputEncoding = $utf8
} catch {
	# Hosts sem console (por exemplo, alguns runners) podem nao expor os encodings.
}

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

function Get-IsccPath {
	$isccCandidates = @()
	$isccCmd = Get-Command "iscc" -ErrorAction SilentlyContinue
	if ($isccCmd) {
		$isccCandidates += $isccCmd.Source
	}
	$isccCandidates += @(
		"${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
		"${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
		"${env:LocalAppData}\Programs\Inno Setup 6\ISCC.exe",
		"${env:ProgramFiles}\Inno Setup 7\ISCC.exe",
		"${env:ProgramFiles(x86)}\Inno Setup 7\ISCC.exe",
		"${env:LocalAppData}\Programs\Inno Setup 7\ISCC.exe"
	)
	return $isccCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
}

function Copy-PdvSourceToTemp {
	param(
		[Parameter(Mandatory = $true)][string]$Source,
		[Parameter(Mandatory = $true)][string]$Destination
	)

	$robocopy = Get-Command "robocopy.exe" -ErrorAction SilentlyContinue
	if (-not $robocopy) {
		throw "robocopy.exe nao encontrado. Ele e necessario para criar a copia isolada do build."
	}

	New-Item -ItemType Directory -Force -Path $Destination | Out-Null
	$excludedDirectories = @(
		(Join-Path $Source ".git"),
		(Join-Path $Source ".npm-cache"),
		(Join-Path $Source "node_modules"),
		(Join-Path $Source "out"),
		(Join-Path $Source "release"),
		(Join-Path $Source "release-build"),
		(Join-Path $Source "installer\output")
	)
	$arguments = @(
		$Source,
		$Destination,
		"/E",
		"/COPY:DAT",
		"/DCOPY:DAT",
		"/R:2",
		"/W:1",
		"/NFL",
		"/NDL",
		"/NJH",
		"/NJS",
		"/NP",
		"/XD"
	) + $excludedDirectories

	& $robocopy.Source @arguments
	$robocopyExitCode = $LASTEXITCODE
	if ($robocopyExitCode -ge 8) {
		throw "Falha ao copiar o PDV para o diretorio temporario (robocopy: $robocopyExitCode)."
	}
}

function Remove-BuildTemp {
	param([Parameter(Mandatory = $true)][string]$Path)

	for ($attempt = 1; $attempt -le 5; $attempt++) {
		if (-not (Test-Path -LiteralPath $Path)) {
			return
		}
		Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
		if (-not (Test-Path -LiteralPath $Path)) {
			return
		}
		[GC]::Collect()
		[GC]::WaitForPendingFinalizers()
		Start-Sleep -Milliseconds (250 * $attempt)
	}
	throw "Nao foi possivel limpar o diretorio temporario: $Path"
}

function Invoke-Local {
	$pdvDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
	$originalLocation = Get-Location

	$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
	Remove-Item Env:npm_config_devdir -ErrorAction SilentlyContinue

	$npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
	if (-not $npm) {
		throw "npm.cmd nao encontrado no PATH. Instale o Node.js 20 ou superior."
	}
	$nodeVersionText = (& node --version 2>$null)
	if ($LASTEXITCODE -ne 0 -or $nodeVersionText -notmatch '^v(\d+)') {
		throw "Nao foi possivel identificar a versao do Node.js."
	}
	if ([int]$Matches[1] -lt 20) {
		throw "Node.js 20 ou superior e obrigatorio. Versao encontrada: $nodeVersionText"
	}
	if (-not (Get-IsccPath)) {
		throw "Inno Setup 6 ou 7 nao encontrado. Instale com: winget install --id JRSoftware.InnoSetup -e"
	}

	$bumpScript = Join-Path $pdvDir "scripts\bump-versao-instalador.ps1"
	. $bumpScript
	$versao = Invoke-BumpVersaoInstalador

	$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) (
		"pdv-mais-gestao-build-{0}-{1}" -f $PID, [guid]::NewGuid().ToString("N")
	)
	$tempSource = Join-Path $tempRoot "source"
	$tempBuild = Join-Path $tempRoot "artifacts"
	$unpacked = Join-Path $tempBuild "win-unpacked"
	try {
		Write-Host "Criando copia isolada do PDV em:"
		Write-Host " - $tempSource"
		Write-Host "O node_modules do workspace nao sera lido, limpo ou alterado."
		Copy-PdvSourceToTemp -Source $pdvDir -Destination $tempSource
		New-Item -ItemType Directory -Force -Path $tempBuild | Out-Null
		Set-Location $tempSource

		$npmCache = (& $npm.Source config get cache 2>$null | Select-Object -Last 1)
		if ($LASTEXITCODE -eq 0 -and $npmCache) {
			$env:npm_config_cache = [string]$npmCache
			Write-Host "Cache npm reutilizado: $env:npm_config_cache"
		}

		Write-Host "Instalando dependencias somente na copia temporaria..."
		Write-Host "O postinstall recompilara os modulos nativos para o Electron."
		& $npm.Source ci --no-audit --no-fund
		if ($LASTEXITCODE -ne 0) {
			throw "npm ci falhou na copia temporaria com codigo $LASTEXITCODE"
		}

		Write-Host "Gerando executavel e instalador NSIS na copia temporaria..."
		& $npm.Source run build
		if ($LASTEXITCODE -ne 0) {
			throw "build falhou com codigo $LASTEXITCODE"
		}

		$electronBuilder = Join-Path $tempSource "node_modules\.bin\electron-builder.cmd"
		& $electronBuilder --win "--config.directories.output=$tempBuild"
		if ($LASTEXITCODE -ne 0) {
			throw "electron-builder falhou com codigo $LASTEXITCODE"
		}

		$releaseBuild = Join-Path $pdvDir "release-build"
		New-Item -ItemType Directory -Force -Path $releaseBuild | Out-Null
		$nsis = Join-Path $tempBuild "PDV-Mais-Gestao-Setup-$versao.exe"
		if (-not (Test-Path -LiteralPath $nsis)) {
			throw "Instalador NSIS nao encontrado: $nsis"
		}
		Copy-Item -LiteralPath $nsis -Destination $releaseBuild -Force

		Write-Host "Compilando instalador Inno Setup..."
		& (Join-Path $pdvDir "installer\compilar-iss.ps1") -NoBump -SourceDir $unpacked

		$zip = Join-Path $releaseBuild "PDV-Mais-Gestao-portable.zip"
		if (Test-Path -LiteralPath $zip) {
			Remove-Item -LiteralPath $zip -Force
		}
		Compress-Archive -Path (Join-Path $unpacked "*") -DestinationPath $zip -Force
	} finally {
		Set-Location $originalLocation
		Write-Host "Limpando copia temporaria..."
		Remove-BuildTemp -Path $tempRoot
	}

	Write-Host ""
	Write-Host "Pacotes gerados:"
	Get-ChildItem (Join-Path $pdvDir "release-build\*") -Include "*.exe", "*.zip" -File -ErrorAction SilentlyContinue |
		ForEach-Object { Write-Host " - $($_.FullName)" }
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
