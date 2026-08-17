#Requires -RunAsAdministrator
param(
	[Parameter(Mandatory = $true)]
	[string]$InstallerExe,
	[string]$Prefix = "${env:ProgramFiles}\PostgreSQL\17",
	[string]$DataDir = "${env:ProgramData}\PDVMaisGestao\pgdata",
	[int]$Port = 5433,
	[string]$User = "pdv",
	[string]$Password = "pdv",
	[string]$Database = "pdv_local",
	[string]$ServiceName = "postgresql-pdv-mais-gestao",
	[string]$SuperUser = "postgres",
	[string]$SuperPassword = "PdvLocal#17Mg"
)

$ErrorActionPreference = "Stop"
$logDir = Join-Path $env:ProgramData "PDVMaisGestao\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "instalar-postgres.log"
$okFile = Join-Path $logDir "postgres-ok.txt"

function Write-Log([string]$Message) {
	$line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
	Add-Content -Path $log -Value $line -Encoding UTF8
	Write-Host $line
}

function Remove-EmptyDir([string]$Path) {
	if (Test-Path $Path) {
		$itens = @(Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue)
		if ($itens.Count -eq 0) {
			Write-Log "Removendo pasta vazia: $Path"
			Remove-Item -LiteralPath $Path -Force -Recurse -ErrorAction SilentlyContinue
		}
	}
}

function Test-PortaAberta {
	try {
		$tcp = New-Object System.Net.Sockets.TcpClient
		$ok = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null).AsyncWaitHandle.WaitOne(800)
		$conectado = $ok -and $tcp.Connected
		$tcp.Close()
		return $conectado
	} catch {
		return $false
	}
}

function Test-PgReady([string]$PgBin) {
	$pgIsReady = Join-Path $PgBin "pg_isready.exe"
	if (Test-Path $pgIsReady) {
		& $pgIsReady -h 127.0.0.1 -p $Port | Out-Null
		return ($LASTEXITCODE -eq 0)
	}
	return Test-PortaAberta
}

function Get-PsqlPath {
	$candidates = @(
		(Join-Path $Prefix "bin\psql.exe"),
		"${env:ProgramFiles}\PostgreSQL\17\bin\psql.exe",
		"${env:ProgramFiles}\PostgreSQL\18\bin\psql.exe"
	)
	foreach ($candidato in $candidates) {
		if (Test-Path $candidato) {
			return $candidato
		}
	}
	$encontrado = Get-ChildItem "${env:ProgramFiles}\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue |
		Select-Object -First 1
	if ($encontrado) {
		return $encontrado.FullName
	}
	return $null
}

function Wait-PgReady([string]$PgBin, [int]$TimeoutSec = 180) {
	$deadline = (Get-Date).AddSeconds($TimeoutSec)
	do {
		if (Test-PgReady $PgBin) {
			return $true
		}
		Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue | Where-Object {
			$_.Status -ne "Running"
		} | ForEach-Object {
			try { Start-Service $_.Name } catch { }
		}
		Start-Sleep -Seconds 3
	} while ((Get-Date) -lt $deadline)
	return (Test-PgReady $PgBin)
}

function Copy-Edblogs {
	Get-ChildItem $env:TEMP -File -ErrorAction SilentlyContinue |
		Where-Object { $_.Name -match "postgres|installbuilder|bitrock" } |
		ForEach-Object {
			Copy-Item $_.FullName (Join-Path $logDir $_.Name) -Force -ErrorAction SilentlyContinue
			Write-Log "Log EDB copiado: $($_.Name)"
			if ($_.Length -lt 8000) {
				Write-Log ((Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue))
			}
		}
}

Write-Log "Inicio da configuracao PostgreSQL do PDV Mais Gestao"

Remove-EmptyDir "${env:ProgramFiles}\PostgreSQL\pdv-17"
Remove-EmptyDir "${env:ProgramData}\PDVMaisGestao\pgsql"
Remove-EmptyDir "${env:ProgramData}\PDVMaisGestao\pgdata"
Remove-EmptyDir $DataDir

$psql = Get-PsqlPath
$pgBin = if ($psql) { Split-Path $psql -Parent } else { Join-Path $Prefix "bin" }

if (Test-PgReady $pgBin) {
	Write-Log "PostgreSQL ja responde em 127.0.0.1:${Port}"
} else {
	if (-not (Test-Path $InstallerExe)) {
		throw "Instalador do PostgreSQL nao encontrado: $InstallerExe"
	}

	# --datadir e obrigatorio no EDB 17. Caminhos entre aspas; datadir sem espaco.
	$argString = @(
		"--mode unattended",
		"--unattendedmodeui minimalWithDialogs",
		"--installer-language en",
		"--superaccount $SuperUser",
		"--superpassword $SuperPassword",
		"--servicename $ServiceName",
		"--serverport $Port",
		"--prefix `"$Prefix`"",
		"--datadir `"$DataDir`"",
		"--disable-components pgAdmin,stackbuilder"
	) -join " "

	Write-Log "Instalando PostgreSQL 17 padrao (porta $Port)"
	Write-Log "Exe: $InstallerExe"
	Write-Log "Args: $argString"

	$psi = New-Object System.Diagnostics.ProcessStartInfo
	$psi.FileName = $InstallerExe
	$psi.Arguments = $argString
	$psi.UseShellExecute = $true
	$psi.WorkingDirectory = Split-Path $InstallerExe -Parent
	$proc = New-Object System.Diagnostics.Process
	$proc.StartInfo = $psi
	[void]$proc.Start()
	$proc.WaitForExit()
	Write-Log "Instalador PostgreSQL encerrou com codigo $($proc.ExitCode)"
	Copy-Edblogs

	if ($proc.ExitCode -ne 0) {
		throw "Falha ao instalar o PostgreSQL (codigo $($proc.ExitCode)). Veja $log e %TEMP%\install-postgresql.log"
	}

	$psql = Get-PsqlPath
	$pgBin = if ($psql) { Split-Path $psql -Parent } else { Join-Path $Prefix "bin" }
	if (-not (Wait-PgReady $pgBin)) {
		throw "PostgreSQL instalado, mas nao respondeu na porta $Port. Veja $log"
	}
}

$psql = Get-PsqlPath
if (-not $psql) {
	throw "psql.exe nao encontrado apos a instalacao do PostgreSQL"
}
$pgBin = Split-Path $psql -Parent
Write-Log "Usando psql: $psql"

function Invoke-PsqlAs([string]$Login, [string]$LoginPassword, [string]$Sql, [string]$Db = "postgres") {
	$env:PGPASSWORD = $LoginPassword
	$env:PGCLIENTENCODING = "UTF8"
	$saida = & $psql -h "127.0.0.1" -p $Port -U $Login -d $Db -v ON_ERROR_STOP=1 -tAc $Sql 2>&1
	if ($LASTEXITCODE -ne 0) {
		throw "psql ($Login) falhou: $saida"
	}
	return ("$saida").Trim()
}

$loginOk = $false
foreach ($par in @(
		@{ U = $SuperUser; P = $SuperPassword },
		@{ U = $User; P = $Password }
	)) {
	try {
		[void](Invoke-PsqlAs $par.U $par.P "SELECT 1")
		$loginOk = $true
		$ativoUser = $par.U
		$ativoPass = $par.P
		Write-Log "Conectado como $($par.U)"
		break
	} catch {
		Write-Log "Login $($par.U) falhou: $($_.Exception.Message)"
	}
}
if (-not $loginOk) {
	throw "Nao foi possivel autenticar no PostgreSQL com postgres nem pdv"
}

$role = Invoke-PsqlAs $ativoUser $ativoPass "SELECT 1 FROM pg_roles WHERE rolname='$User'"
if ($role -ne "1") {
	Write-Log "Criando role $User"
	[void](Invoke-PsqlAs $ativoUser $ativoPass "CREATE ROLE $User LOGIN PASSWORD '$Password' SUPERUSER CREATEDB")
} else {
	[void](Invoke-PsqlAs $ativoUser $ativoPass "ALTER ROLE $User WITH LOGIN SUPERUSER CREATEDB PASSWORD '$Password'")
	Write-Log "Role $User atualizada"
}

$existe = Invoke-PsqlAs $User $Password "SELECT 1 FROM pg_database WHERE datname='$Database'"
if ($existe -ne "1") {
	Write-Log "Criando banco $Database"
	[void](Invoke-PsqlAs $User $Password "CREATE DATABASE $Database OWNER $User ENCODING 'UTF8' TEMPLATE template0")
} else {
	Write-Log "Banco $Database ja existe"
}

Set-Content -Path $okFile -Value (Get-Date -Format "o") -Encoding ASCII
Write-Log "PostgreSQL PDV pronto em postgresql://${User}@127.0.0.1:${Port}/${Database}"
exit 0
