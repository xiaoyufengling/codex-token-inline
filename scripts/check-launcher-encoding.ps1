$ctiPath = Join-Path $PSScriptRoot '..\installer\launch-native.ps1'
$ctiTokens = $null
$ctiErrors = $null
$ctiAst = [Management.Automation.Language.Parser]::ParseFile($ctiPath,[ref]$ctiTokens,[ref]$ctiErrors)
if ($ctiErrors.Count) { throw 'Launcher parse error' }
$ctiExpected = -join @(0x8BF7,0x5148,0x6B63,0x5E38,0x9000,0x51FA | ForEach-Object { [char]$_ })
$ctiFound = @($ctiAst.FindAll({param($n) $n -is [Management.Automation.Language.StringConstantExpressionAst]},$true) | Where-Object { $_.Value.StartsWith($ctiExpected) })
if ($ctiFound.Count -ne 1) { throw 'Windows PowerShell decoded localized text incorrectly' }
$ctiBytes = [IO.File]::ReadAllBytes($ctiPath)
if ($ctiBytes[0] -ne 239 -or $ctiBytes[1] -ne 187 -or $ctiBytes[2] -ne 191) { throw 'UTF-8 BOM missing' }
Write-Output 'Windows PowerShell 5.1: Chinese restart prompt decoded correctly; syntax passed.'
