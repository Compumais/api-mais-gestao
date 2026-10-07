#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Registra (ou remove) o PDV como serviço em segundo plano no Windows.

.DESCRIPTION
  Cria uma tarefa agendada que inicia "PDV Mais Gestão.exe --lan-service" no boot,
  como SYSTEM, sem janela e sem exigir login do Windows nem do operador.
  O processo sobe a API LAN (:5050), o sync (outbox) e a reconciliação de NFC-e.
  O app do caixa continua funcionando normalmente: se o serviço já atende a LAN,
  o app não disputa a porta.

  -UserData aponta para os dados do app do caixa (XML da NFC-e, certificados,
  imagens). Sem isso o SYSTEM usaria o próprio perfil e não enxergaria esses arquivos.
#>
param(
	[ValidateSet("Registrar", "Remover")]
	[string]$Acao = "Registrar",
	[string]$ExePath,
	[string]$UserData,
	[string]$TaskName = "PDV Mais Gestao - Servico",
	[int]$AtrasoSegundos = 30
)

$ErrorActionPreference = "Stop"
$logDir = Join-Path $env:ProgramData "PDVMaisGestao\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "registrar-servico-pdv.log"

function Write-Log([string]$Message) {
	$line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
	Add-Content -Path $log -Value $line -Encoding UTF8
	Write-Host $line
}

function Remove-Tarefa {
	$existente = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
	if ($null -eq $existente) { return }
	Write-Log "Parando e removendo tarefa existente: $TaskName"
	Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
	# Encerra o processo que a tarefa deixou de pé (libera o .exe para atualizar).
	Get-CimInstance Win32_Process -Filter "Name LIKE 'PDV Mais Gest%.exe'" -ErrorAction SilentlyContinue |
		Where-Object { $_.CommandLine -like "*--lan-service*" } |
		ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
	Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

try {
	if ($Acao -eq "Remover") {
		Remove-Tarefa
		Write-Log "Serviço do PDV removido."
		exit 0
	}

	if (-not $ExePath -or -not (Test-Path -LiteralPath $ExePath)) {
		throw "Executável do PDV não encontrado: $ExePath"
	}

	$argumentos = "--lan-service"
	if ($UserData) {
		New-Item -ItemType Directory -Force -Path $UserData | Out-Null
		$argumentos += " --pdv-user-data=`"$UserData`""
	}

	Remove-Tarefa

	$acaoTarefa = New-ScheduledTaskAction -Execute $ExePath -Argument $argumentos -WorkingDirectory (Split-Path -Parent $ExePath)
	$gatilho = New-ScheduledTaskTrigger -AtStartup
	# Dá tempo para o PostgreSQL local subir; o app ainda tenta reconectar sozinho.
	$gatilho.Delay = "PT$($AtrasoSegundos)S"
	$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
	$config = New-ScheduledTaskSettingsSet `
		-AllowStartIfOnBatteries `
		-DontStopIfGoingOnBatteries `
		-StartWhenAvailable `
		-MultipleInstances IgnoreNew `
		-ExecutionTimeLimit ([TimeSpan]::Zero) `
		-RestartCount 999 `
		-RestartInterval (New-TimeSpan -Minutes 1)

	Register-ScheduledTask -TaskName $TaskName -Action $acaoTarefa -Trigger $gatilho -Principal $principal -Settings $config `
		-Description "PDV Mais Gestão em segundo plano: API LAN, sync e NFC-e sem abrir o caixa." | Out-Null
	Write-Log "Tarefa registrada: $TaskName ($ExePath $argumentos)"

	Start-ScheduledTask -TaskName $TaskName
	Write-Log "Tarefa iniciada."
	exit 0
}
catch {
	Write-Log "ERRO: $($_.Exception.Message)"
	exit 1
}
