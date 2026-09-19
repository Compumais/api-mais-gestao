#Requires -Version 5.1
<#
.SYNOPSIS
	Bump de versao do PDV com base em package.json e installer/output.
#>
param(
	[switch]$Bump,
	[switch]$WriteManifestOnly
)

$ErrorActionPreference = "Stop"

$Script:PdvDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$Script:PkgPath = Join-Path $Script:PdvDir "package.json"
$Script:OutputDir = Join-Path $Script:PdvDir "installer\output"
$Script:SetupPrefix = "PDV-Mais-Gestao-Setup-"

function Test-Semver {
	param([string]$Version)
	return [bool]($Version -match '^\d+\.\d+\.\d+$')
}

function Compare-Semver {
	param(
		[Parameter(Mandatory = $true)][string]$A,
		[Parameter(Mandatory = $true)][string]$B
	)
	$pa = $A.Split('.') | ForEach-Object { [int]$_ }
	$pb = $B.Split('.') | ForEach-Object { [int]$_ }
	for ($i = 0; $i -lt 3; $i++) {
		if ($pa[$i] -lt $pb[$i]) { return -1 }
		if ($pa[$i] -gt $pb[$i]) { return 1 }
	}
	return 0
}

function Get-MaxVersao {
	param([string[]]$Versoes)
	$validas = @($Versoes | Where-Object { Test-Semver $_ })
	if ($validas.Count -eq 0) { return $null }
	$max = $validas[0]
	foreach ($v in $validas) {
		if ((Compare-Semver $v $max) -gt 0) { $max = $v }
	}
	return $max
}

function Get-VersaoPackageJson {
	$pkg = Get-Content -LiteralPath $Script:PkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
	$v = [string]$pkg.version
	if (-not (Test-Semver $v)) {
		throw "Versao invalida em package.json: $v"
	}
	return $v
}

function Get-VersaoOutput {
	$versoes = @()
	$manifest = Join-Path $Script:OutputDir "version.json"
	if (Test-Path -LiteralPath $manifest) {
		try {
			$json = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
			if ($json.version -and (Test-Semver ([string]$json.version))) {
				$versoes += [string]$json.version
			}
		} catch {
			Write-Host "Aviso: version.json invalido em installer\output"
		}
	}
	if (Test-Path -LiteralPath $Script:OutputDir) {
		Get-ChildItem -LiteralPath $Script:OutputDir -Filter "$Script:SetupPrefix*.exe" -File -ErrorAction SilentlyContinue |
			ForEach-Object {
				$name = $_.BaseName
				if ($name -match '^PDV-Mais-Gestao-Setup-(\d+\.\d+\.\d+)$') {
					$versoes += $Matches[1]
				}
			}
	}
	return Get-MaxVersao $versoes
}

function Get-NextPatch {
	param([Parameter(Mandatory = $true)][string]$Version)
	$p = $Version.Split('.') | ForEach-Object { [int]$_ }
	return "{0}.{1}.{2}" -f $p[0], $p[1], ($p[2] + 1)
}

function Set-VersaoPackageJson {
	param([Parameter(Mandatory = $true)][string]$Version)
	$raw = Get-Content -LiteralPath $Script:PkgPath -Raw -Encoding UTF8
	$atualizado = [regex]::Replace(
		$raw,
		'"version"\s*:\s*"[^"]*"',
		('"version": "{0}"' -f $Version),
		1
	)
	if ($atualizado -eq $raw -and $raw -notmatch [regex]::Escape('"version": "' + $Version + '"')) {
		throw "Nao foi possivel atualizar version em package.json"
	}
	$utf8NoBom = New-Object System.Text.UTF8Encoding $false
	[System.IO.File]::WriteAllText($Script:PkgPath, $atualizado, $utf8NoBom)
}

function Invoke-BumpVersaoInstalador {
	$pkg = Get-VersaoPackageJson
	$out = Get-VersaoOutput
	$base = $pkg
	if ($out -and ((Compare-Semver $out $pkg) -gt 0)) {
		$base = $out
	}
	$nova = Get-NextPatch $base
	Write-Host ("Bump de versao: {0} -> {1} (package={2}, output={3})" -f $base, $nova, $pkg, $(if ($out) { $out } else { "-" }))
	Set-VersaoPackageJson -Version $nova
	return $nova
}

function Publish-FileAtomically {
	param(
		[Parameter(Mandatory = $true)][string]$Source,
		[Parameter(Mandatory = $true)][string]$Destination
	)
	$destinationDir = Split-Path -Parent $Destination
	New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
	$temporary = Join-Path $destinationDir (".{0}.{1}.tmp" -f ([System.IO.Path]::GetFileName($Destination)), [guid]::NewGuid().ToString("N"))
	$backup = "$temporary.bak"
	try {
		Copy-Item -LiteralPath $Source -Destination $temporary -Force
		if (Test-Path -LiteralPath $Destination) {
			[System.IO.File]::Replace($temporary, $Destination, $backup, $true)
			Remove-Item -LiteralPath $backup -Force -ErrorAction SilentlyContinue
		} else {
			[System.IO.File]::Move($temporary, $Destination)
		}
	} finally {
		Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
		Remove-Item -LiteralPath $backup -Force -ErrorAction SilentlyContinue
	}
}

function Publish-InstallerArtifact {
	param(
		[Parameter(Mandatory = $true)][string]$Source,
		[Parameter(Mandatory = $true)][string]$Version,
		[string]$DestinationDirectory = $Script:OutputDir
	)
	if (-not (Test-Semver $Version)) {
		throw "Versao invalida para publicar setup: $Version"
	}
	if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
		throw "Setup de origem nao encontrado: $Source"
	}
	$artifact = "{0}{1}.exe" -f $Script:SetupPrefix, $Version
	$destination = Join-Path $DestinationDirectory $artifact
	Publish-FileAtomically -Source $Source -Destination $destination
	Write-Host "Setup publicado atomicamente: $destination"
	return $destination
}

function Write-VersionJson {
	param([Parameter(Mandatory = $true)][string]$Version)
	New-Item -ItemType Directory -Force -Path $Script:OutputDir | Out-Null
	$artifact = "{0}{1}.exe" -f $Script:SetupPrefix, $Version
	$previousArtifact = $null
	$path = Join-Path $Script:OutputDir "version.json"
	if (Test-Path -LiteralPath $path) {
		try {
			$previousManifest = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
			$previousArtifact = [string]$previousManifest.artifact
		} catch {
			Write-Host "Aviso: version.json anterior invalido; nenhum setup antigo sera removido"
		}
	}
	$setupPath = Join-Path $Script:OutputDir $artifact
	if (-not (Test-Path -LiteralPath $setupPath)) {
		throw "Setup nao encontrado para gerar manifesto: $setupPath"
	}
	$artifactToRemove = $null
	if (
		$previousArtifact -and
		$previousArtifact -ne $artifact -and
		$previousArtifact -match '^PDV-Mais-Gestao-Setup-\d+\.\d+\.\d+\.exe$' -and
		[System.IO.Path]::GetFileName($previousArtifact) -eq $previousArtifact -and
		(Test-Path -LiteralPath (Join-Path $Script:OutputDir $previousArtifact) -PathType Leaf)
	) {
		$artifactToRemove = $previousArtifact
	} else {
		$previousVersions = @(
			Get-ChildItem -LiteralPath $Script:OutputDir -Filter "$Script:SetupPrefix*.exe" -File -ErrorAction SilentlyContinue |
				ForEach-Object {
					if (
						$_.Name -match '^PDV-Mais-Gestao-Setup-(\d+\.\d+\.\d+)\.exe$' -and
						(Compare-Semver $Matches[1] $Version) -lt 0
					) {
						$Matches[1]
					}
				}
		)
		$previousVersion = Get-MaxVersao $previousVersions
		if ($previousVersion) {
			$artifactToRemove = "{0}{1}.exe" -f $Script:SetupPrefix, $previousVersion
		}
	}
	$setup = Get-Item -LiteralPath $setupPath
	$manifest = [ordered]@{
		version    = $Version
		artifact   = $artifact
		url        = "/pdv/updates/$artifact"
		releasedAt = (Get-Date).ToUniversalTime().ToString("o")
		sha256     = (Get-FileHash -LiteralPath $setupPath -Algorithm SHA256).Hash.ToLowerInvariant()
		size       = $setup.Length
	}
	$json = $manifest | ConvertTo-Json -Depth 4
	$utf8NoBom = New-Object System.Text.UTF8Encoding $false
	$manifestTemporary = Join-Path $Script:OutputDir (".version.json.{0}.tmp" -f [guid]::NewGuid().ToString("N"))
	try {
		[System.IO.File]::WriteAllText($manifestTemporary, $json + "`n", $utf8NoBom)
		Publish-FileAtomically -Source $manifestTemporary -Destination $path
	} finally {
		Remove-Item -LiteralPath $manifestTemporary -Force -ErrorAction SilentlyContinue
	}
	Write-Host "Manifesto escrito: $path"

	if ($artifactToRemove) {
		$previousPath = Join-Path $Script:OutputDir $artifactToRemove
		if (Test-Path -LiteralPath $previousPath -PathType Leaf) {
			Write-Host "Removendo apenas o setup anterior: $artifactToRemove"
			Remove-Item -LiteralPath $previousPath -Force
		}
	}
}

# Execucao direta (nao quando importado via dot-sourcing sem flags)
if ($MyInvocation.InvocationName -ne '.' -and ($Bump -or $WriteManifestOnly)) {
	if ($Bump) {
		$v = Invoke-BumpVersaoInstalador
		Write-Host "Nova versao: $v"
	}
	if ($WriteManifestOnly) {
		$v = Get-VersaoPackageJson
		Write-VersionJson -Version $v
	}
}
