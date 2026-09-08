param([Parameter(Mandatory=$true)][string]$ResultFile)
$ErrorActionPreference = 'Stop'
try {
    $ctiPackage = Get-AppxPackage -Name 'OpenAI.Codex' | Where-Object { $_.Version -eq '26.901.6511.0' } | Select-Object -First 1
    if ($null -eq $ctiPackage) { throw 'Supported Codex 26.901.6511.0 was not found. The original Codex has not been changed.' }
    $ctiSource = Join-Path $ctiPackage.InstallLocation 'app'
    if (-not (Test-Path -LiteralPath (Join-Path $ctiSource 'ChatGPT.exe'))) { throw 'Codex executable was not found.' }
    [IO.File]::WriteAllText($ResultFile, $ctiSource, (New-Object Text.UTF8Encoding($false)))
} catch {
    [IO.File]::WriteAllText($ResultFile, $_.Exception.Message, (New-Object Text.UTF8Encoding($false)))
    exit 1
}
