#define AppVersion "0.2.0-alpha.6"
[Setup]
AppId={{3CBAA15D-8E64-43F6-A972-7C5F5C67F821}
AppName=Codex Token Inline
AppVersion={#AppVersion}
AppPublisher=xiaoyufengling
AppPublisherURL=https://github.com/xiaoyufengling
DefaultDirName={localappdata}\Programs\CodexTokenInline
DisableDirPage=yes
DisableWelcomePage=no
DisableFinishedPage=no
ShowLanguageDialog=yes
DefaultGroupName=Codex Token Inline
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\.local\dist
OutputBaseFilename=CodexTokenInline-Setup-{#AppVersion}
SetupIconFile=..\.local\build\app.ico
UninstallDisplayIcon={app}\CodexTokenInline.exe
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
CloseApplications=no
RestartApplications=no
VersionInfoVersion=0.2.0.6

[Languages]
Name: "chinesesimp"; MessagesFile: "ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
chinesesimp.WelcomeLabel2=为已安装的原版 Codex 添加简洁 Token 用量。%n%n首次使用需要退出 Codex，再从 Codex Token Inline 入口打开。%n%nby xiaoyufengling · 参考 JiaYang-BUAA 的开源实现
english.WelcomeLabel2=Add inline token usage to your installed original Codex.%n%nQuit Codex before first use, then open it through Codex Token Inline.%n%nby xiaoyufengling · With thanks to JiaYang-BUAA
chinesesimp.FinishedLabel=Codex Token Inline {#AppVersion}%nby xiaoyufengling · github.com/xiaoyufengling%n%n安装完成。请正常退出当前 Codex，再从桌面“Codex Token Inline”打开原版。之后也请使用这个增强入口。%n%n版本、作者与卸载入口，可随时从开始菜单的“Manage Codex Token Inline”查看。
english.FinishedLabel=Codex Token Inline {#AppVersion}%nby xiaoyufengling · github.com/xiaoyufengling%n%nInstalled. Quit Codex, then use the Codex Token Inline entry to open your original Codex. Use this entry for future enhanced launches.%n%nFind version, author and uninstall options in Start menu > Manage Codex Token Inline.

[CustomMessages]
chinesesimp.ExistingInstall=请先卸载已有的 Codex Token Inline，再安装此版本。
english.ExistingInstall=Please uninstall the existing Codex Token Inline version first.
chinesesimp.QuitBeforeUninstall=请先正常退出 Codex，等待 10 秒后再卸载。
english.QuitBeforeUninstall=Please quit Codex and wait 10 seconds before uninstalling.
chinesesimp.OwnershipError=无法验证此安装的归属。
english.OwnershipError=Installation ownership could not be verified.

[Files]
Source: "..\.local\build\CodexTokenInline.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.local\build\app.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.local\build\node.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.local\build\NODE-LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\*.mjs"; DestDir: "{app}\src"; Flags: ignoreversion
Source: "..\bin\native-runtime.mjs"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: "..\bin\update.mjs"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: "..\release.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "check-updates.ps1"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "..\adapters\desktop\profiles\*.json"; DestDir: "{app}\adapters\desktop\profiles"; Flags: ignoreversion
Source: "launch-native.ps1"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "ownership.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\THIRD_PARTY_NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\Codex Token Inline"; Filename: "{app}\CodexTokenInline.exe"; IconFilename: "{app}\app.ico"
Name: "{group}\Codex Token Inline"; Filename: "{app}\CodexTokenInline.exe"; IconFilename: "{app}\app.ico"
Name: "{group}\Manage Codex Token Inline"; Filename: "{app}\CodexTokenInline.exe"; Parameters: "--manage"; IconFilename: "{app}\app.ico"

[UninstallDelete]
Type: files; Name: "{app}\state\runtime.json"
Type: files; Name: "{app}\state\launcher.json"
Type: files; Name: "{app}\state\objectives.json"
Type: files; Name: "{app}\language.txt"
Type: files; Name: "{app}\state\update.json"
Type: files; Name: "{app}\state\update-installer.exe"
Type: dirifempty; Name: "{app}\state"
Type: dirifempty; Name: "{app}"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var Language: String;
begin
  if CurStep = ssPostInstall then begin
    if ActiveLanguage = 'english' then Language := 'en' else Language := 'zh';
    if not FileExists(ExpandConstant('{app}\language.txt')) then
      SaveStringToFile(ExpandConstant('{app}\language.txt'), Language, False);
  end;
end;
procedure AuthorLinkClick(Sender: TObject; const Link: string; LinkType: TSysLinkType);
var Code: Integer;
begin
  if Link = 'https://github.com/xiaoyufengling' then
    ShellExec('open', Link, '', '', SW_SHOWNORMAL, ewNoWait, Code);
end;

procedure InitializeWizard();
var AuthorLink: TNewLinkLabel;
begin
  WizardForm.Caption := 'Codex Token Inline {#AppVersion}';
  AuthorLink := TNewLinkLabel.Create(WizardForm);
  AuthorLink.Parent := WizardForm;
  AuthorLink.Left := ScaleX(16);
  AuthorLink.Top := WizardForm.CancelButton.Top + ScaleY(4);
  AuthorLink.Width := WizardForm.BackButton.Left - ScaleX(24);
  AuthorLink.Height := ScaleY(22);
  AuthorLink.Caption := '<a href="https://github.com/xiaoyufengling">xiaoyufengling · GitHub</a>';
  AuthorLink.OnLinkClick := @AuthorLinkClick;
end;

function InitializeSetup(): Boolean;
var Root: String; Marker: AnsiString; Code: Integer;
begin
  Result := True;
  Root := ExpandConstant('{localappdata}\Programs\CodexTokenInline');
  if DirExists(Root) then begin
      if LoadStringFromFile(Root + '\ownership.txt', Marker) and
        (Trim(String(Marker)) = 'codex-token-inline:3CBAA15D-8E64-43F6-A972-7C5F5C67F821') and
        FileExists(Root + '\CodexTokenInline.exe') then
        begin
          Result := not CheckForMutexes('Local\CodexTokenInline.NativeRuntime');
          if not Result then MsgBox(CustomMessage('QuitBeforeUninstall'), mbInformation, MB_OK);
          exit;
        end;
    MsgBox(CustomMessage('ExistingInstall'), mbInformation, MB_OK);
    Result := False;
  end;
end;

function InitializeUninstall(): Boolean;
var Marker: AnsiString;
begin
  Result := LoadStringFromFile(ExpandConstant('{app}\ownership.txt'), Marker) and
    (Trim(String(Marker)) = 'codex-token-inline:3CBAA15D-8E64-43F6-A972-7C5F5C67F821');
  if not Result then begin
    MsgBox(CustomMessage('OwnershipError'), mbError, MB_OK);
    exit;
  end;
  if CheckForMutexes('Local\CodexTokenInline.NativeRuntime') then begin
    MsgBox(CustomMessage('QuitBeforeUninstall'), mbInformation, MB_OK);
    Result := False;
  end;
end;
