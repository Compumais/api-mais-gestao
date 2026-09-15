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

function Clear-OldSetups {
	param([Parameter(Mandatory = $true)][string]$KeepVersion)
	if (-not (Test-Path -LiteralPath $Script:OutputDir)) { return }
	$keepName = "{0}{1}.exe" -f $Script:SetupPrefix, $KeepVersion
	Get-ChildItem -LiteralPath $Script:OutputDir -Filter "$Script:SetupPrefix*.exe" -File -ErrorAction SilentlyContinue |
		Where-Object { $_.Name -ne $keepName } |
		ForEach-Object {
			Write-Host "Removendo setup antigo: $($_.Name)"
			Remove-Item -LiteralPath $_.FullName -Force
		}
}

function Write-VersionJson {
	param([Parameter(Mandatory = $true)][string]$Version)
	New-Item -ItemType Directory -Force -Path $Script:OutputDir | Out-Null
	$artifact = "{0}{1}.exe" -f $Script:SetupPrefix, $Version
	$manifest = [ordered]@{
		version    = $Version
		artifact   = $artifact
		url        = "/pdv/updates/$artifact"
		releasedAt = (Get-Date).ToUniversalTime().ToString("o")
	}
	$path = Join-Path $Script:OutputDir "version.json"
	$json = $manifest | ConvertTo-Json -Depth 4
	$utf8NoBom = New-Object System.Text.UTF8Encoding $false
	[System.IO.File]::WriteAllText($path, $json + "`n", $utf8NoBom)
	Write-Host "Manifesto escrito: $path"
	Clear-OldSetups -KeepVersion $Version
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
