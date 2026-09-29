param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$brandDeep = [System.Drawing.ColorTranslator]::FromHtml('#284550')
$white = [System.Drawing.Color]::White

function New-LogoBitmap {
  param(
    [int]$Size,
    [double]$SourceExtent,
    [System.Drawing.Color]$Background,
    [bool]$Transparent = $false
  )

  $pixelFormat = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, $pixelFormat)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear($(if ($Transparent) { [System.Drawing.Color]::Transparent } else { $Background }))

  $scale = $SourceExtent / 800.0
  $origin = ($Size - $SourceExtent) / 2.0
  $graphics.TranslateTransform([single]$origin, [single]$origin)
  $graphics.ScaleTransform([single]$scale, [single]$scale)

  $brush = New-Object System.Drawing.SolidBrush($white)
  $ringPen = New-Object System.Drawing.Pen($white, 28)
  $connectionPen = New-Object System.Drawing.Pen($white, 104)
  $connectionPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $connectionPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $connectionPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $graphics.FillEllipse($brush, 196, 98, 184, 184)
  $graphics.DrawEllipse($ringPen, 474, 100, 156, 156)

  $curve = New-Object System.Drawing.Drawing2D.GraphicsPath
  $curve.StartFigure()
  $curve.AddBezier(110, 662, 110, 485, 164, 385, 292, 369)
  $curve.AddBezier(292, 369, 404, 355, 583, 380, 690, 346)
  $graphics.DrawPath($connectionPen, $curve)

  $curve.Dispose()
  $connectionPen.Dispose()
  $ringPen.Dispose()
  $brush.Dispose()
  $graphics.Dispose()
  return $bitmap
}

function Save-LogoPng {
  param(
    [string]$RelativePath,
    [int]$Size,
    [double]$SourceExtent,
    [bool]$Transparent
  )

  $path = Join-Path $projectRoot $RelativePath
  $bitmap = New-LogoBitmap -Size $Size -SourceExtent $SourceExtent -Background $brandDeep -Transparent $Transparent
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

# iOS and legacy Android icons must fill the square; the operating system adds
# its own mask. Adaptive and splash artwork stays transparent above the color
# configured in app.json.
Save-LogoPng 'assets/images/icon.png' 1024 860 $false
Save-LogoPng 'assets/images/favicon.png' 48 44 $false
Save-LogoPng 'assets/images/android-icon-foreground.png' 1024 560 $true
Save-LogoPng 'assets/images/android-icon-monochrome.png' 1024 560 $true
Save-LogoPng 'assets/images/splash-icon.png' 512 440 $true

Write-Output 'Generated Luni icon, adaptive, monochrome, splash, and favicon assets.'
