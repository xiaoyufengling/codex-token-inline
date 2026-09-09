param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$ctiRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$ctiEnglish = [Globalization.CultureInfo]::CurrentUICulture.TwoLetterISOLanguageName -ne 'zh'
$ctiLanguageFile = Join-Path $ctiRoot 'language.txt'
if (Test-Path -LiteralPath $ctiLanguageFile) { $ctiEnglish = [IO.File]::ReadAllText($ctiLanguageFile).Trim() -eq 'en' }
function Get-CtiMessage([string]$Zh, [string]$En) { if ($ctiEnglish) { return $En }; return $Zh }
$ctiNode = Join-Path $ctiRoot 'node.exe'
if (-not (Test-Path -LiteralPath $ctiNode)) { $ctiNode = Join-Path $ctiRoot '.local\build\node.exe' }
$ctiLock = New-Object Threading.Mutex($false, 'Local\CodexTokenInline.NativeRuntime')
$ctiOwnsLock = $false
$ctiState = Join-Path $ctiRoot 'state'
function Write-CtiStage([string]$Phase, [string]$Detail = '') {
    if ($CheckOnly) { return }
    New-Item -ItemType Directory -Force -Path $ctiState | Out-Null
    [IO.File]::WriteAllText((Join-Path $ctiState 'launcher.json'), (@{phase=$Phase;detail=$Detail;at=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json -Compress))
}
try {
    try { $ctiOwnsLock = $ctiLock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ctiOwnsLock = $true }
    if (-not $ctiOwnsLock) { exit 0 }
    Write-CtiStage 'checking-version'
    $ctiPackage = Get-AppxPackage -Name 'OpenAI.Codex' | Sort-Object Version -Descending | Select-Object -First 1
    if (-not $ctiPackage) { throw (Get-CtiMessage '未找到已安装的 Codex。' 'Installed Codex was not found.') }
    $ctiArchive = Join-Path $ctiPackage.InstallLocation 'app\resources\app.asar'
    $ctiRuntime = Join-Path $ctiRoot 'bin\native-runtime.mjs'
    & $ctiNode $ctiRuntime $ctiArchive 0 unused --check
    if ($LASTEXITCODE -ne 0) { throw (Get-CtiMessage '无法识别此 Codex 的消息结构，请检查更新。原版未被修改。' 'Codex message structure could not be identified. Check for updates. The original app was not changed.') }
    if ($CheckOnly) { exit 0 }
    $ctiOriginalExe = Join-Path $ctiPackage.InstallLocation 'app\ChatGPT.exe'
    $ctiRunning = @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object { $_.ExecutablePath -eq $ctiOriginalExe })
    if ($ctiRunning.Count -gt 0) {
        throw (Get-CtiMessage '请先正常退出原版 Codex，再打开“Codex Token Inline”。首次使用需要重启 Codex。' 'Please quit Codex, then open Codex Token Inline. A restart is needed for first use.')
    }
    $ctiListener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
    $ctiListener.Start()
    $ctiPort = $ctiListener.LocalEndpoint.Port
    $ctiListener.Stop()
    $ctiManifest = [xml](Get-Content -LiteralPath (Join-Path $ctiPackage.InstallLocation 'AppxManifest.xml') -Raw)
    $ctiApplication = @($ctiManifest.Package.Applications.Application) | Where-Object { [string]$_.Executable -match '(?i)ChatGPT\.exe$' } | Select-Object -First 1
    if (-not $ctiApplication.Id) { throw 'Cannot resolve original Codex application identity.' }
    $ctiAppId = "$($ctiPackage.PackageFamilyName)!$($ctiApplication.Id)"
    # Adapted from JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows.
    # See THIRD_PARTY_NOTICES.md for attribution and retained MIT license.
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace CtiNative {
  [ComImport, Guid("2e941141-7f97-4756-ba1d-9decde894a3d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IApplicationActivationManager {
    [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string id, [MarshalAs(UnmanagedType.LPWStr)] string args, uint options, out uint processId);
  }
  [ComImport, Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")] public class ApplicationActivationManager {}
  public static class Launcher {
    public static uint Activate(string id, string args) {
      var manager = (IApplicationActivationManager)new ApplicationActivationManager();
      uint processId;
      Marshal.ThrowExceptionForHR(manager.ActivateApplication(id, args, 2, out processId));
      return processId;
    }
  }
}
'@
    Write-CtiStage 'activating-original'
    $ctiPid = [CtiNative.Launcher]::Activate($ctiAppId, "--remote-debugging-port=$ctiPort --remote-debugging-address=127.0.0.1 --remote-allow-origins=http://127.0.0.1:$ctiPort")
    $ctiProcess = Get-Process -Id $ctiPid -ErrorAction Stop
    if ($ctiProcess.Path -ne $ctiOriginalExe) { throw 'Activated process did not match the original Codex installation.' }
    $ctiEndpoint = $null
    $ctiDeadline = [DateTime]::UtcNow.AddSeconds(30)
    while ([DateTime]::UtcNow -lt $ctiDeadline) {
        $ctiEndpoint = Get-NetTCPConnection -LocalPort $ctiPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($ctiEndpoint) { break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ctiEndpoint -or $ctiEndpoint.LocalAddress -ne '127.0.0.1' -or $ctiEndpoint.OwningProcess -ne $ctiPid) {
        throw 'Cannot verify a loopback debugging endpoint owned by the original Codex process.'
    }
    Write-CtiStage 'original-endpoint-verified'
    New-Item -ItemType Directory -Force -Path $ctiState | Out-Null
    & $ctiNode $ctiRuntime $ctiArchive $ctiPort (Join-Path $ctiState 'runtime.json')
    if ($LASTEXITCODE -ne 0) { throw (Get-CtiMessage '原版已打开，但用量接入失败。请保留此提示并反馈。' 'Original Codex opened, but usage attachment failed. Please report this message.') }
    Write-CtiStage 'stopped'
} catch {
    if ($CheckOnly) { Write-Error $_; exit 1 }
    try { Write-CtiStage 'error' $_.Exception.Message } catch {}
    Add-Type -AssemblyName System.Windows.Forms
    [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Codex Token Inline', 'OK', 'Information') | Out-Null
    exit 1
} finally {
    if ($ctiOwnsLock) { $ctiLock.ReleaseMutex() }
    $ctiLock.Dispose()
}
