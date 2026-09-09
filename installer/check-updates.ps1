param([switch]$Manual)
$ErrorActionPreference = 'Stop'
$ctiRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$ctiEnglish = [Globalization.CultureInfo]::CurrentUICulture.TwoLetterISOLanguageName -ne 'zh'
if (Test-Path (Join-Path $ctiRoot 'language.txt')) { $ctiEnglish = [IO.File]::ReadAllText((Join-Path $ctiRoot 'language.txt')).Trim() -eq 'en' }
function L([string]$Zh,[string]$En) { if ($ctiEnglish) { return $En }; return $Zh }
$ctiMutex = New-Object Threading.Mutex($false,'Local\CodexTokenInline.UpdateCheck')
$ctiLocked = $false
try {
    try { $ctiLocked = $ctiMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ctiLocked = $true }
    if (-not $ctiLocked) { exit }
    Add-Type -AssemblyName System.Windows.Forms
    $ctiPackage = Get-AppxPackage -Name OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1
    if (-not $ctiPackage) { throw 'Codex not installed' }
    $ctiNode = Join-Path $ctiRoot 'node.exe'
    $ctiScript = Join-Path $ctiRoot 'bin\update.mjs'
    $ctiMode = if ($Manual) { 'manual' } else { 'auto' }
    $ctiRaw = & $ctiNode $ctiScript $ctiMode $ctiPackage.Version 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Check failed' }
    $ctiUpdate = $ctiRaw | ConvertFrom-Json
    if (-not $ctiUpdate.tag) {
        if ($Manual) { [Windows.Forms.MessageBox]::Show((L '目前没有适配此 Codex 的更新版本。' 'No newer release compatible with this Codex was found.'),'Codex Token Inline') | Out-Null }
        exit
    }
    $ctiForm = New-Object Windows.Forms.Form
    $ctiForm.Text = 'Codex Token Inline'
    $ctiForm.ClientSize = New-Object Drawing.Size(490,190)
    $ctiForm.StartPosition = 'CenterScreen'; $ctiForm.FormBorderStyle = 'FixedDialog'; $ctiForm.MaximizeBox = $false
    $ctiLabel = New-Object Windows.Forms.Label
    $ctiLabel.SetBounds(20,20,450,85)
    $ctiLabel.Text = (L "发现兼容的新版本 $($ctiUpdate.version)。`n可以下载并安装；正在运行的 Codex 不会被自动关闭。" "Compatible update $($ctiUpdate.version) is available.`nDownload and install when ready. Codex will not be closed automatically.")
    $ctiNow = New-Object Windows.Forms.Button; $ctiNow.SetBounds(20,125,140,36); $ctiNow.Text = (L '下载并安装' 'Download & install'); $ctiNow.DialogResult = 'Yes'
    $ctiLater = New-Object Windows.Forms.Button; $ctiLater.SetBounds(175,125,140,36); $ctiLater.Text = (L '稍后' 'Later'); $ctiLater.DialogResult = 'Cancel'
    $ctiSkip = New-Object Windows.Forms.Button; $ctiSkip.SetBounds(330,125,140,36); $ctiSkip.Text = (L '跳过此版本' 'Skip version'); $ctiSkip.DialogResult = 'No'
    $ctiForm.Controls.AddRange(@($ctiLabel,$ctiNow,$ctiLater,$ctiSkip))
    $ctiChoice = $ctiForm.ShowDialog(); $ctiForm.Dispose()
    if ($ctiChoice -eq 'No') { & $ctiNode $ctiScript skip $ctiPackage.Version $ctiUpdate.tag | Out-Null; exit }
    if ($ctiChoice -ne 'Yes') { exit }
    $ctiResult = & $ctiNode $ctiScript download $ctiPackage.Version $ctiUpdate.tag 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Download verification failed' }
    $ctiDownload = $ctiResult | ConvertFrom-Json
    $ctiExpected = Join-Path $ctiRoot 'state\update-installer.exe'
    if ([IO.Path]::GetFullPath($ctiDownload.file) -ne $ctiExpected) { throw 'Unexpected update path' }
    Start-Process -FilePath $ctiExpected -WindowStyle Normal
} catch {
    if ($Manual -or $ctiChoice -eq 'Yes') { [Windows.Forms.MessageBox]::Show((L '更新检查或下载失败，请稍后重试。现有安装未改动。' 'Update check or download failed. Try again later. Existing installation is unchanged.'),'Codex Token Inline') | Out-Null }
} finally {
    if ($ctiLocked) { $ctiMutex.ReleaseMutex() }; $ctiMutex.Dispose()
}
