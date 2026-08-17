; Instalador Windows do PDV Mais Gestão (Inno Setup 6.1+)
; Empacota o app Electron e instala um PostgreSQL 17 local na porta 5433
; (usuario pdv / senha pdv / banco pdv_local), igual ao docker-compose do PDV.
;
; Se o PDV ja estiver instalado, apenas atualiza os arquivos do app e preserva o banco.
; Versao mais nova ja instalada: cancela. Mesma versao: repara arquivos.
;
; Compilar:
;   1. cd pdv && npm run pack:dir
;   2. (opcional) copie o instalador EDB para installer\vendor\postgresql-17-windows-x64.exe
;   3. npm run pack:iss   OU   ISCC.exe /DMyAppVersion=x.y.z installer\pdv-mais-gestao.iss

#ifndef MyAppVersion
  #define MyAppVersion "0.1.1"
#endif

#define MyAppName "PDV Mais Gestão"
#define MyAppPublisher "Mais Gestão"
#define MyAppExeName "PDV Mais Gestão.exe"
#define MyAppGuid "7E4B9A21-6C3F-4D8E-B1A5-9F2C8E4D6A10"
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
VersionInfoVersion={#MyAppVersion}.0
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
DefaultDirName={autopf}\PDV Mais Gestao
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=auto
UsePreviousAppDir=yes
UsePreviousGroup=yes
UsePreviousTasks=yes
UsePreviousLanguage=yes
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
CloseApplications=force
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
  Flags: preservestringtype createvalueifdoesntexist; Tasks: postgres

[Run]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""PDV Mais Gestao LAN"""; Flags: runhidden waituntilterminated; StatusMsg: "Liberando porta LAN no firewall..."
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""PDV Mais Gestao LAN TCP"""; Flags: runhidden waituntilterminated
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""PDV Mais Gestao LAN"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""PDV Mais Gestao LAN TCP"" dir=in action=allow protocol=TCP localport=5050 profile=any"; Flags: runhidden waituntilterminated
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""PDV Mais Gestao LAN"""; Flags: runhidden waituntilterminated; RunOnceId: "RemovePdvLanFw"
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""PDV Mais Gestao LAN TCP"""; Flags: runhidden waituntilterminated; RunOnceId: "RemovePdvLanFwTcp"
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""try {{ Stop-Service -Name '{#PostgresService}' -Force -ErrorAction SilentlyContinue }} catch {{ }}"""; \
  Flags: runhidden waituntilterminated; RunOnceId: "StopPdvPostgres"

[Code]
var
  DownloadPage: TDownloadWizardPage;
  UpgradeMode: Boolean;
  InstalledVersion: String;

function UninstallRegKey: String;
begin
  Result := ExpandConstant('Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1');
end;

function GetInstalledVersion: String;
begin
  Result := '';
  if not RegQueryStringValue(HKLM, UninstallRegKey, 'DisplayVersion', Result) then
    RegQueryStringValue(HKCU, UninstallRegKey, 'DisplayVersion', Result);
end;

function CompareVersion(V1, V2: String): Integer;
var
  P, N1, N2: Integer;
begin
  repeat
    P := Pos('.', V1);
    if P > 0 then
    begin
      N1 := StrToIntDef(Copy(V1, 1, P - 1), 0);
      Delete(V1, 1, P);
    end
    else
    begin
      N1 := StrToIntDef(V1, 0);
      V1 := '';
    end;
    P := Pos('.', V2);
    if P > 0 then
    begin
      N2 := StrToIntDef(Copy(V2, 1, P - 1), 0);
      Delete(V2, 1, P);
    end
    else
    begin
      N2 := StrToIntDef(V2, 0);
      V2 := '';
    end;
    if N1 < N2 then
    begin
      Result := -1;
      Exit;
    end;
    if N1 > N2 then
    begin
      Result := 1;
      Exit;
    end;
  until (V1 = '') and (V2 = '');
  Result := 0;
end;

function OnDownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  Result := True;
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

function PrecisaInstalarPostgres: Boolean;
begin
  Result := WizardIsTaskSelected('postgres') and (not PostgresJaPronto);
end;

function InitializeSetup: Boolean;
var
  Cmp: Integer;
begin
  Result := True;
  InstalledVersion := GetInstalledVersion;
  UpgradeMode := InstalledVersion <> '';

  if not UpgradeMode then
    Exit;

  Cmp := CompareVersion(InstalledVersion, '{#MyAppVersion}');
  if Cmp > 0 then
  begin
    MsgBox('Ja existe uma versao mais recente do PDV Mais Gestao (' + InstalledVersion + ').' + #13#10 +
      'Este pacote e a versao {#MyAppVersion} e nao sera instalado.', mbError, MB_OK);
    Result := False;
    Exit;
  end;

  if Cmp = 0 then
  begin
    Result := MsgBox('A versao {#MyAppVersion} ja esta instalada.' + #13#10 + #13#10 +
      'Deseja reparar/atualizar os arquivos do aplicativo?' + #13#10 +
      'O PostgreSQL e os dados de venda serao mantidos.', mbConfirmation, MB_YESNO) = IDYES;
    Exit;
  end;

  Result := MsgBox('O PDV Mais Gestao ' + InstalledVersion + ' sera atualizado para {#MyAppVersion}.' + #13#10 + #13#10 +
    'Somente os arquivos do aplicativo serao substituidos.' + #13#10 +
    'O PostgreSQL local e o banco pdv_local serao preservados.', mbConfirmation, MB_OKCANCEL) = IDOK;
end;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(
    'PostgreSQL 17',
    'Baixando o instalador oficial do PostgreSQL 17 (EDB). Necessario apenas na primeira instalacao.',
    @OnDownloadProgress);
  if UpgradeMode then
    WizardForm.Caption := 'Atualizar {#MyAppName} {#MyAppVersion}';
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if (CurPageID = wpSelectTasks) and UpgradeMode and PostgresJaPronto then
    WizardSelectTasks('!postgres');
  if (CurPageID = wpReady) and UpgradeMode then
    WizardForm.ReadyLabel.Caption :=
      'O PDV ja instalado (' + InstalledVersion + ') sera atualizado para {#MyAppVersion}.' + #13#10 +
      'O banco de dados local sera mantido.';
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  NeedsRestart := False;

#ifndef PostgresBundled
  if PrecisaInstalarPostgres then
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
  if (CurStep = ssPostInstall) and PrecisaInstalarPostgres then
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
