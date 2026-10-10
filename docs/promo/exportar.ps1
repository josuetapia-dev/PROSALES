# Exporta las imágenes promocionales del instalador (manifest -> screenshots).
# Requisitos: Apache de XAMPP encendido y Microsoft Edge instalado.
# Uso:  powershell -ExecutionPolicy Bypass -File docs\promo\exportar.ps1
#       powershell -ExecutionPolicy Bypass -File docs\promo\exportar.ps1 -Slides 2 -Formatos narrow
# preferredColorScheme=1 fuerza el modo claro de la app dentro del marco.

param([string]$Slides = '1,2,3', [string]$Formatos = 'wide,narrow', [string]$OutDir = 'C:\xampp\htdocs\prosales\ejercicio-5-offline\screenshots', [string]$Scheme = '1')
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$prof = "C:\Users\JOSUE PEREZ TAPIA\AppData\Local\Temp\prosales-promo"
foreach ($f in $Formatos.Split(',')) {
  foreach ($s in $Slides.Split(',')) {
    if ($f -eq 'wide') { $size = '1280,720'; $name = "promo-escritorio-$s.png" } else { $size = '540,960'; $name = "promo-movil-$s.png" }
    $out = Join-Path $OutDir $name
    $argumentos = @('--headless=new', "--user-data-dir=`"$prof`"", '--no-first-run', '--disable-gpu', '--hide-scrollbars',
      "--blink-settings=preferredColorScheme=$Scheme", "--window-size=$size", '--force-device-scale-factor=1.5',
      '--virtual-time-budget=8000', "--screenshot=`"$out`"", "http://localhost/prosales/docs/promo/promo.html?slide=$s&formato=$f")
    Start-Process -FilePath $edge -ArgumentList $argumentos -Wait | Out-Null
    Add-Type -AssemblyName System.Drawing
    $i = [System.Drawing.Image]::FromFile($out); "$name $($i.Width)x$($i.Height) $([math]::Round((Get-Item $out).Length/1KB))KB"; $i.Dispose()
  }
}
