; Instalador Windows do PDV Mais Gestão (Inno Setup 6.1+)
; Empacota o app Electron e instala um PostgreSQL 17 local na porta 5433
; (usuario pdv / senha pdv / banco pdv_local), igual ao docker-compose do PDV.
;
; Compilar:
;   1. cd pdv && npm run pack:dir
;   2. (opcional) copie o instalador EDB para installer\vendor\postgresql-17-windows-x64.exe
;   3. npm run pack:iss   OU   ISCC.exe installer\pdv-mais-gestao.iss

#define MyAppName "PDV Mais Gestão"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Mais Gestão"
#define MyAppExeName "PDV Mais Gestão.exe"
#define MyAppId "{{7E4B9A21-6C3F-4D8E-B1A5-9F2C8E4D6A10}"
#define SourceDir "..\release\win-unpacked"
#define PostgresPort "5433"
#define PostgresUser "pdv"
#define PostgresPassword "pdv"
#define PostgresDatabase "pdv_local"
#define PostgresService "postgresql-pdv-mais-gestao"
#define PostgresDownloadUrl "https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64.exe"
#define PostgresVendorFile "vendor\postgresql-17-windows-x64.exe"
#define DatabaseUrl "postgresql://pdv:pdv@127.0.0.1:5433/pdv_local"

#if FileExists(PostgresVendorFile)
  #define PostgresBundled
#endif

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\PDV Mais Gestao
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=PDV-Mais-Gestao-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
ChangesEnvironment=yes
CloseApplications=yes
RestartApplications=no
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupLogging=yes
AllowNoIcons=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "postgres"; Description: "Instalar PostgreSQL 17 local (porta {#PostgresPort}, banco {#PostgresDatabase})"; GroupDescription: "Banco de dados"; Flags: checkedonce

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\instalar-postgres.ps1"; DestDir: "{app}\installer"; Flags: ignoreversion
#ifdef PostgresBundled
Source: "{#PostgresVendorFile}"; DestDir: "{tmp}"; DestName: "postgresql-windows-x64.exe"; Flags: deleteafterinstall
#endif

[Dirs]
Name: "{commonappdata}\PDVMaisGestao\logs"; Tasks: postgres

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; \
  ValueType: string; ValueName: "PDV_DATABASE_URL"; ValueData: "{#DatabaseUrl}"; \
  Flags: preservestringtype; Tasks: postgres

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""try {{ Stop-Service -Name '{#PostgresService}' -Force -ErrorAction SilentlyContinue }} catch {{ }}"""; \
  Flags: runhidden waituntilterminated; RunOnceId: "StopPdvPostgres"

[Code]
var
  DownloadPage: TDownloadWizardPage;

function OnDownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  Result := True;
end;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(
    'PostgreSQL 17',
    'Baixando o instalador oficial do PostgreSQL 17 (EDB). Necessario apenas se o arquivo nao foi empacotado em vendor\.',
    @OnDownloadProgress);
end;

function PostgresJaPronto: Boolean;
var
  ResultCode: Integer;
begin
  Result := False;
  if Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
    '-NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect(''127.0.0.1'', {#PostgresPort}); $c.Close(); exit 0 } catch { exit 1 }"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    Result := ResultCode = 0;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  NeedsRestart := False;

#ifndef PostgresBundled
  if WizardIsTaskSelected('postgres') and (not PostgresJaPronto) then
  begin
    DownloadPage.Clear;
    DownloadPage.Add('{#PostgresDownloadUrl}', 'postgresql-windows-x64.exe', '');
    DownloadPage.Show;
    try
      try
        DownloadPage.Download;
      except
        Result := 'Nao foi possivel baixar o PostgreSQL 17.' + #13#10 +
          'Baixe manualmente:' + #13#10 +
          '{#PostgresDownloadUrl}' + #13#10 +
          'salve em pdv\installer\vendor\postgresql-17-windows-x64.exe e compile o instalador novamente.' + #13#10 +
          GetExceptionMessage;
      end;
    finally
      DownloadPage.Hide;
    end;
  end;
#endif
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  Params: String;
begin
  if (CurStep = ssPostInstall) and WizardIsTaskSelected('postgres') then
  begin
    Params := ExpandConstant(
      '-NoProfile -ExecutionPolicy Bypass -File "{app}\installer\instalar-postgres.ps1" -InstallerExe "{tmp}\postgresql-windows-x64.exe" -Prefix "{commonpf}\PostgreSQL\17" -DataDir "{commonappdata}\PDVMaisGestao\pgdata" -Port {#PostgresPort} -User "{#PostgresUser}" -Password "{#PostgresPassword}" -Database "{#PostgresDatabase}" -ServiceName "{#PostgresService}"');
    if (not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
      Params, '', SW_SHOW, ewWaitUntilTerminated, ResultCode)) or (ResultCode <> 0) then
    begin
      MsgBox('Nao foi possivel instalar o PostgreSQL local (codigo ' + IntToStr(ResultCode) + ').' + #13#10 + #13#10 +
        'O PDV precisa do banco em 127.0.0.1:{#PostgresPort}.' + #13#10 +
        'Veja o log em %ProgramData%\PDVMaisGestao\logs\instalar-postgres.log',
        mbError, MB_OK);
    end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usDone then
    MsgBox('O aplicativo foi removido.' + #13#10 + #13#10 +
      'O PostgreSQL local e os dados em %ProgramData%\PDVMaisGestao\pgdata foram mantidos para nao perder vendas.' + #13#10 +
      'Para remove-los, use "Adicionar ou remover programas" no PostgreSQL 17.',
      mbInformation, MB_OK);
end;
