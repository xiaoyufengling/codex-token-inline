#define AppVersion "0.1.0-alpha.1"
[Setup]
AppId={{3CBAA15D-8E64-43F6-A972-7C5F5C67F821}
AppName=Codex Token Inline
AppVersion={#AppVersion}
AppPublisher=xiaoyufengling
AppPublisherURL=https://github.com/xiaoyufengling
DefaultDirName={localappdata}\Programs\CodexTokenInline
DisableDirPage=yes
DefaultGroupName=Codex Token Inline
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\.local\dist
OutputBaseFilename=CodexTokenInline-Setup-{#AppVersion}
SetupIconFile=..\.local\build\app.ico
UninstallDisplayIcon={app}\CodexTokenInline.exe
UninstallDisplayName=Codex Token Inline
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=110
CloseApplications=no
RestartApplications=no
SetupLogging=no
DiskSpanning=no
ExtraDiskSpaceRequired=2500000000
VersionInfoVersion=0.1.0.1
VersionInfoCompany=xiaoyufengling
VersionInfoDescription=Codex Token Inline Setup
InfoBeforeFile=welcome.txt
Uninstallable=yes

[Languages]
Name: "chinesesimp"; MessagesFile: "ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
english.WelcomeLabel1=Codex Token Inline
english.WelcomeLabel2=Install the token counter into a separate local Codex copy.%n%nYour original Codex and conversations remain available.%n%nby xiaoyufengling  |  0.1.0-alpha.1
english.FinishedLabel=Installation complete. Open "Codex Token Inline" from your desktop or Start menu.%n%nYour current Codex window has not been closed. You can close it when your work is finished.%n%nTo uninstall, use Windows Settings > Apps or "Manage Codex Token Inline" in the Start menu.
chinesesimp.WelcomeLabel1=Codex Token Inline
chinesesimp.WelcomeLabel2=给 Codex 加上一行简洁的 Token 用量。%n%n安装独立的本地副本，保留原版 Codex 和聊天记录。%n%nby xiaoyufengling  |  0.1.0-alpha.1
chinesesimp.FinishedLabel=安装完成。从桌面或开始菜单打开 Codex Token Inline 即可使用。%n%n当前 Codex 窗口没有被关闭，等手头工作结束后再切换即可。%n%n卸载：Windows 设置 → 应用 → Codex Token Inline，或打开开始菜单里的管理入口。

[CustomMessages]
chinesesimp.OpenApp=打开 Codex Token Inline
english.OpenApp=Open Codex Token Inline
chinesesimp.Preparing=正在检查 Codex 并生成本地副本，可能需要几分钟……
english.Preparing=Checking Codex and preparing the local copy. This may take a few minutes...
chinesesimp.AlreadyInstalled=此体验版已经安装。请从 Windows 的“已安装的应用”中卸载后再安装。
english.AlreadyInstalled=This preview is already installed. Please uninstall it before installing again.
chinesesimp.CloseClient=请先关闭通过安装器安装的 Codex Token Inline 窗口，再重新卸载。其他 Codex 窗口可以保持打开。
english.CloseClient=Please close the installed Codex Token Inline window, then uninstall again. Your other Codex windows can stay open.

[Files]
Source: "..\.local\build\node.exe"; DestDir: "{tmp}\cti-tools"; Flags: dontcopy
Source: "..\src\*.mjs"; DestDir: "{tmp}\cti-tools\src"; Flags: dontcopy
Source: "..\adapters\desktop\*.cjs"; DestDir: "{tmp}\cti-tools\adapters\desktop"; Flags: dontcopy
Source: "..\adapters\desktop\profiles\*.json"; DestDir: "{tmp}\cti-tools\adapters\desktop\profiles"; Flags: dontcopy
Source: "prepare-install.mjs"; DestDir: "{tmp}\cti-tools\installer"; Flags: dontcopy
Source: "find-codex.ps1"; DestDir: "{tmp}\cti-tools\installer"; Flags: dontcopy
Source: "cleanup-stage.mjs"; DestDir: "{tmp}\cti-tools\installer"; Flags: dontcopy
Source: "\\?\{tmp}\cti-tools\.local\desktop\*"; DestDir: "\\?\{app}\desktop"; Flags: external recursesubdirs createallsubdirs ignoreversion
Source: "..\.local\build\CodexTokenInline.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.local\build\app.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "ownership.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.local\build\NODE-LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\Codex Token Inline"; Filename: "{app}\CodexTokenInline.exe"; IconFilename: "{app}\app.ico"
Name: "{group}\Codex Token Inline"; Filename: "{app}\CodexTokenInline.exe"; IconFilename: "{app}\app.ico"
Name: "{group}\Manage Codex Token Inline"; Filename: "{app}\CodexTokenInline.exe"; Parameters: "--manage"; IconFilename: "{app}\app.ico"

[Run]
Filename: "{app}\CodexTokenInline.exe"; Description: "{cm:OpenApp}"; Flags: nowait postinstall skipifsilent unchecked

[UninstallDelete]
Type: filesandordirs; Name: "\\?\{app}\profile"
Type: filesandordirs; Name: "\\?\{app}\desktop"
Type: dirifempty; Name: "{app}"

[Code]
var Prepared: Boolean;
function GetFileAttributesW(Name: String): LongWord;
  external 'GetFileAttributesW@kernel32.dll stdcall';

function HasLinks(const Dir: String): Boolean;
var Rec: TFindRec;
begin
  Result := False;
  if (GetFileAttributesW(Dir) and $400) <> 0 then begin Result := True; exit; end;
  if FindFirst(AddBackslash(Dir) + '*', Rec) then begin
    try
      repeat
        if (Rec.Name <> '.') and (Rec.Name <> '..') then begin
          if (Rec.Attributes and $400) <> 0 then begin Result := True; exit; end;
          if (Rec.Attributes and FILE_ATTRIBUTE_DIRECTORY) <> 0 then
            if HasLinks(AddBackslash(Dir) + Rec.Name) then begin Result := True; exit; end;
        end;
      until not FindNext(Rec);
    finally FindClose(Rec); end;
  end;
end;

function OwnsInstall(): Boolean;
var Marker: AnsiString;
begin
  Result := LoadStringFromFile(ExpandConstant('{app}\ownership.txt'), Marker) and
    (Trim(String(Marker)) = 'codex-token-inline:3CBAA15D-8E64-43F6-A972-7C5F5C67F821');
end;

function InitializeSetup(): Boolean;
var InstalledRoot: String; Marker: AnsiString; Code: Integer;
begin
  Result := True;
  if WizardSilent then exit;
  if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{3CBAA15D-8E64-43F6-A972-7C5F5C67F821}_is1', 'InstallLocation', InstalledRoot) then
    if LoadStringFromFile(AddBackslash(InstalledRoot) + 'ownership.txt', Marker) and
       (Trim(String(Marker)) = 'codex-token-inline:3CBAA15D-8E64-43F6-A972-7C5F5C67F821') and
       FileExists(AddBackslash(InstalledRoot) + 'CodexTokenInline.exe') then
      if Exec(AddBackslash(InstalledRoot) + 'CodexTokenInline.exe', '--manage', InstalledRoot,
        SW_SHOWNORMAL, ewNoWait, Code) then Result := False;
end;

function IsClientRunning(): Boolean;
var Locator, Services, Processes: Variant;
    QueryPath: String;
begin
  { Ask a local process query about only this installation; never stop other Codex windows. }
  Result := True;
  try
    Locator := CreateOleObject('WbemScripting.SWbemLocator');
    Services := Locator.ConnectServer('', 'root\CIMV2');
    QueryPath := ExpandConstant('{app}\desktop\ChatGPT.exe');
    StringChangeEx(QueryPath, '\', '\\', True);
    StringChangeEx(QueryPath, '''', '\''', True);
    Processes := Services.ExecQuery('SELECT ProcessId FROM Win32_Process WHERE ExecutablePath = ''' + QueryPath + '''');
    Result := Processes.Count > 0;
  except end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var Code: Integer; Source, ToolsDir, Report: String; Bytes: AnsiString;
begin
  Result := '';
  if Prepared then exit;
  if DirExists(ExpandConstant('{app}')) then begin
    if not OwnsInstall() then begin Result := 'The destination already exists and is not owned by this installer.'; exit; end;
    Result := CustomMessage('AlreadyInstalled'); exit;
  end;
  if FileExists(ExpandConstant('{autodesktop}\Codex Token Inline.lnk')) or
     DirExists(ExpandConstant('{group}')) then begin
    Result := 'An existing Codex Token Inline shortcut or Start menu folder was found. Please move it before installing.'; exit;
  end;
  WizardForm.StatusLabel.Caption := CustomMessage('Preparing');
  ExtractTemporaryFiles('{tmp}\cti-tools\*');
  ToolsDir := ExpandConstant('{tmp}\cti-tools');
  Report := ToolsDir + '\result.txt';
  if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + ToolsDir + '\installer\find-codex.ps1" -ResultFile "' + Report + '"',
    '', SW_HIDE, ewWaitUntilTerminated, Code) then begin Result := 'Could not check the Codex installation.'; exit; end;
  LoadStringFromFile(Report, Bytes); Source := UTF8Decode(Bytes);
  if Code <> 0 then begin Result := Source; exit; end;
  if not Exec(ToolsDir + '\node.exe', '"' + ToolsDir + '\installer\prepare-install.mjs" "' + Source + '" "' + Report + '"',
    ToolsDir, SW_HIDE, ewWaitUntilTerminated, Code) then begin Result := 'Could not prepare the local copy.'; exit; end;
  if Code <> 0 then begin
    LoadStringFromFile(Report, Bytes); Result := UTF8Decode(Bytes); exit;
  end;
  Prepared := True;
end;

function InitializeUninstall(): Boolean;
begin
  Result := False;
  if not OwnsInstall() then begin MsgBox('Installation ownership could not be verified. No cleanup was performed.', mbError, MB_OK); exit; end;
  if HasLinks('\\?\' + ExpandConstant('{app}')) then begin MsgBox('An unexpected linked folder exists in this installation. No cleanup was performed.', mbError, MB_OK); exit; end;
  if IsClientRunning() then begin MsgBox(CustomMessage('CloseClient'), mbInformation, MB_OK); exit; end;
  Result := True;
end;

procedure DeinitializeSetup();
var Code: Integer; ToolsDir: String;
begin
  ToolsDir := ExpandConstant('{tmp}\cti-tools');
  if FileExists(ToolsDir + '\node.exe') then
    Exec(ToolsDir + '\node.exe', '"' + ToolsDir + '\installer\cleanup-stage.mjs"', ToolsDir,
      SW_HIDE, ewWaitUntilTerminated, Code);
end;
