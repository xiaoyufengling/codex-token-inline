param(
    [string]$NodePath = (Get-Command node -ErrorAction Stop).Source,
    [string]$CompilerPath = (Join-Path $PSScriptRoot '..\.local\tools\InnoSetup\ISCC.exe'),
    [switch]$LegacyCopy
)
$ErrorActionPreference = 'Stop'
$ctiRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$ctiBuild = Join-Path $ctiRoot '.local\build'
New-Item -ItemType Directory -Force -Path $ctiBuild | Out-Null
# Windows PowerShell 5.1 reads BOM-less UTF-8 as the active ANSI code page.
# Keep localized launcher messages intact in the packaged script.
$ctiNativeScript = Join-Path $PSScriptRoot 'launch-native.ps1'
[IO.File]::WriteAllText($ctiNativeScript, [IO.File]::ReadAllText($ctiNativeScript), (New-Object Text.UTF8Encoding($true)))
$ctiUpdateScript = Join-Path $PSScriptRoot 'check-updates.ps1'
[IO.File]::WriteAllText($ctiUpdateScript, [IO.File]::ReadAllText($ctiUpdateScript), (New-Object Text.UTF8Encoding($true)))
Copy-Item -LiteralPath $NodePath -Destination (Join-Path $ctiBuild 'node.exe')
Copy-Item -LiteralPath (Join-Path (Split-Path $NodePath) 'LICENSE') -Destination (Join-Path $ctiBuild 'NODE-LICENSE.txt')

# Deterministic Windows icon encoding from the supplied original, without repainting it.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @([Drawing.Bitmap].Assembly.Location,[Drawing.Rectangle].Assembly.Location) -TypeDefinition @'
using System.Drawing;
public static class CtiIconBounds {
    public static Rectangle Find(Bitmap image) {
        int left=image.Width, top=image.Height, right=-1, bottom=-1;
        for(int y=0;y<image.Height;y++) for(int x=0;x<image.Width;x++) {
            if(image.GetPixel(x,y).A < 4) continue;
            if(x<left) left=x; if(x>right) right=x;
            if(y<top) top=y; if(y>bottom) bottom=y;
        }
        return right<0 ? new Rectangle(0,0,image.Width,image.Height) : Rectangle.FromLTRB(left,top,right+1,bottom+1);
    }
}
'@
$ctiImage = [Drawing.Bitmap]::new((Join-Path $ctiRoot 'assets\branding\icon-source.png'))
$ctiBounds = [CtiIconBounds]::Find($ctiImage)
$ctiFrames = @()
try {
    foreach ($ctiSize in @(16,24,32,48,64,128,256)) {
        $ctiBitmap = [Drawing.Bitmap]::new($ctiSize,$ctiSize,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $ctiGraphics = [Drawing.Graphics]::FromImage($ctiBitmap)
        try {
            $ctiGraphics.Clear([Drawing.Color]::Transparent)
            $ctiGraphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $ctiScale = ($ctiSize * 0.96) / [Math]::Max($ctiBounds.Width,$ctiBounds.Height)
            $ctiWidth = [single]($ctiBounds.Width*$ctiScale)
            $ctiHeight = [single]($ctiBounds.Height*$ctiScale)
            $ctiRect = [Drawing.RectangleF]::new(($ctiSize-$ctiWidth)/2,($ctiSize-$ctiHeight)/2,$ctiWidth,$ctiHeight)
            $ctiSourceRect = [Drawing.RectangleF]::new($ctiBounds.X,$ctiBounds.Y,$ctiBounds.Width,$ctiBounds.Height)
            $ctiGraphics.DrawImage($ctiImage, $ctiRect, $ctiSourceRect, [Drawing.GraphicsUnit]::Pixel)
            $ctiStream = [IO.MemoryStream]::new()
            try { $ctiBitmap.Save($ctiStream,[Drawing.Imaging.ImageFormat]::Png); $ctiFrames += ,$ctiStream.ToArray() }
            finally { $ctiStream.Dispose() }
        } finally { $ctiGraphics.Dispose(); $ctiBitmap.Dispose() }
    }
} finally { $ctiImage.Dispose() }
$ctiIconStream = [IO.File]::Create((Join-Path $ctiBuild 'app.ico'))
$ctiWriter = [IO.BinaryWriter]::new($ctiIconStream)
try {
    $ctiWriter.Write([uint16]0); $ctiWriter.Write([uint16]1); $ctiWriter.Write([uint16]$ctiFrames.Count)
    $ctiOffset = 6 + 16 * $ctiFrames.Count
    $ctiSizes = @(16,24,32,48,64,128,256)
    for ($ctiIndex=0; $ctiIndex -lt $ctiFrames.Count; $ctiIndex++) {
        $ctiDimension = $ctiSizes[$ctiIndex] % 256
        $ctiWriter.Write([byte]$ctiDimension); $ctiWriter.Write([byte]$ctiDimension)
        $ctiWriter.Write([byte]0); $ctiWriter.Write([byte]0)
        $ctiWriter.Write([uint16]1); $ctiWriter.Write([uint16]32)
        $ctiWriter.Write([uint32]$ctiFrames[$ctiIndex].Length); $ctiWriter.Write([uint32]$ctiOffset)
        $ctiOffset += $ctiFrames[$ctiIndex].Length
    }
    foreach ($ctiFrame in $ctiFrames) { $ctiWriter.Write([byte[]]$ctiFrame) }
} finally { $ctiWriter.Dispose() }
$ctiCsc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$ctiLauncherSource = if ($LegacyCopy) { 'Launcher.cs' } else { 'NativeLauncher.cs' }
$ctiInstallerSource = if ($LegacyCopy) { 'setup.iss' } else { 'native.iss' }
& $ctiCsc /nologo /target:winexe "/win32icon:$ctiBuild\app.ico" "/out:$ctiBuild\CodexTokenInline.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll (Join-Path $PSScriptRoot $ctiLauncherSource)
if ($LASTEXITCODE -ne 0) { throw 'Launcher compilation failed' }
& $CompilerPath (Join-Path $PSScriptRoot $ctiInstallerSource)
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed' }
Copy-Item -LiteralPath (Join-Path $ctiRoot 'release.json') -Destination (Join-Path $ctiRoot '.local\dist\compatibility.json') -Force
