<#
.SYNOPSIS
  Genera un audio narrado (MP3) en ingles para un tema, a partir de su
  content/<slug>/en.md, usando la voz de Windows (SAPI). El resultado se
  guarda en public/audio/<slug>.mp3 para que la app lo sirva/descargue.

.PARAMETER Slug
  Carpeta del tema dentro de content/, ej. "effleurage".

.PARAMETER Rate
  Velocidad de la voz SAPI, de -10 (mas lenta) a 10 (mas rapida). Default 0.

.EXAMPLE
  .\scripts\generate-audio.ps1 -Slug effleurage
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Slug,

    [int]$Rate = 0
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$mdPath = Join-Path $root "public\content\$Slug\en.md"
$audioDir = Join-Path $root "public\audio"
$wavPath = Join-Path $audioDir "$Slug.wav"
$mp3Path = Join-Path $audioDir "$Slug.mp3"

if (-not (Test-Path $mdPath)) {
    throw "No se encontro $mdPath. Revisa que el slug sea correcto."
}
if (-not (Test-Path $audioDir)) {
    New-Item -ItemType Directory -Path $audioDir -Force | Out-Null
}

# Markdown -> texto plano simple: saca encabezados (#), listas (-, *) y
# marcado (**bold**), para que la voz no lea simbolos.
$raw = Get-Content -Path $mdPath -Raw
$text = $raw -replace '(?m)^#+\s*', '' `
             -replace '(?m)^[-*]\s*', '' `
             -replace '\*\*([^*]+)\*\*', '$1' `
             -replace '`([^`]+)`', '$1'

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = $Rate

$voice = $synth.GetInstalledVoices() |
    Where-Object { $_.VoiceInfo.Culture.Name -like "en-*" } |
    Select-Object -First 1
if ($voice) {
    $synth.SelectVoice($voice.VoiceInfo.Name)
    Write-Host "Usando voz: $($voice.VoiceInfo.Name)"
} else {
    Write-Warning "No se encontro una voz en ingles instalada; se usa la voz por defecto."
}

$synth.SetOutputToWaveFile($wavPath)
$synth.Speak($text)
$synth.SetOutputToNull()
$synth.Dispose()

Write-Host "WAV generado: $wavPath"

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($ffmpeg) {
    & ffmpeg -y -loglevel error -i $wavPath -codec:a libmp3lame -qscale:a 4 $mp3Path
    Remove-Item $wavPath
    Write-Host "MP3 generado: $mp3Path"
} else {
    Write-Warning "ffmpeg no esta instalado; se deja el archivo en WAV ($wavPath). La app tambien puede servir .wav si se ajusta topics.json."
}

Write-Host "Listo. Actualiza 'hasAudio': true para '$Slug' en public/data/topics.json."
