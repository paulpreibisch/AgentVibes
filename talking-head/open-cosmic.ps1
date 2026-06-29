#
# open-cosmic.ps1 — launch the AgentVibes cosmic avatar stage in a dedicated
# Chrome app window with autoplay enabled (so audio plays hands-free).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File open-cosmic.ps1            # gallery
#   powershell -ExecutionPolicy Bypass -File open-cosmic.ps1 partydemo  # self-playing party
#   powershell -ExecutionPolicy Bypass -File open-cosmic.ps1 party      # live party cast
#   powershell -ExecutionPolicy Bypass -File open-cosmic.ps1 regular    # single avatar
#   powershell -ExecutionPolicy Bypass -File open-cosmic.ps1 opencast   # themed cast
#
param([string]$View = "gallery")

$ErrorActionPreference = "Stop"
$thDir = "$env:USERPROFILE\.agentvibes\talking-head"
$prof  = "$thDir\chrome-profile"
$port  = 3747
$base  = "http://localhost:$port"

# Map the friendly view name to a URL
switch ($View.ToLower()) {
  "meeting"   { $url = "$base/cosmic.html" }              # AgentVibes HTML Receiver (live)
  "gallery"   { $url = "$base/gallery.html" }
  "partydemo" { $url = "$base/cosmic.html?demo=party" }
  "party"     { $url = "$base/cosmic.html?mode=party" }
  "regular"   { $url = "$base/cosmic.html?mode=regular" }
  "opencast"  { $url = "$base/cosmic.html?mode=opencast" }
  default     { $url = "$base/$View" }   # treat as a literal path
}

# Ensure the talking-head server is running
try { Invoke-WebRequest "$base/health" -UseBasicParsing -TimeoutSec 3 | Out-Null }
catch {
  Write-Host "Starting talking-head server..." -ForegroundColor Cyan
  Start-Process -FilePath "node" -ArgumentList "`"$thDir\server.js`"" -WorkingDirectory $thDir `
    -RedirectStandardOutput "$thDir\server.log" -RedirectStandardError "$thDir\server.err.log" -WindowStyle Hidden
  Start-Sleep -Seconds 2
}

# Ensure the WARM piper server is running (sub-second avatar synthesis — no per-call model load)
try { Invoke-WebRequest "http://127.0.0.1:5001/voices" -UseBasicParsing -TimeoutSec 2 | Out-Null }
catch {
  $py = (Get-Command python -ErrorAction SilentlyContinue).Source
  if (-not $py) { $py = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" }
  $vdir = "$env:USERPROFILE\.claude\piper-voices"
  $sv = (Get-Content "$env:USERPROFILE\.claude\tts-voice.txt" -ErrorAction SilentlyContinue)
  if (-not $sv) { $sv = "en_US-amy-medium" }
  $sv = ($sv -split '::')[0]
  $model = "$vdir\$sv.onnx"
  if (-not (Test-Path $model)) { $model = "$vdir\en_US-amy-medium.onnx" }
  if ((Test-Path $py) -and (Test-Path $model)) {
    Write-Host "Starting warm piper server (voice $sv)..." -ForegroundColor Cyan
    Start-Process -FilePath $py -ArgumentList "-m piper.http_server -m `"$model`" --data-dir `"$vdir`" --sentence-silence 0.0 --host 127.0.0.1 --port 5001" `
      -WindowStyle Hidden -RedirectStandardOutput "$env:USERPROFILE\.agentvibes\piper-server.log" -RedirectStandardError "$env:USERPROFILE\.agentvibes\piper-server.err.log"
    Start-Sleep -Seconds 5
  }
}

# Idempotent: if a receiver window is already connected, refresh it in place
# instead of opening a duplicate. (Multiple Claude sessions can call this safely.)
try {
  $hb = (Invoke-WebRequest "$base/has-browser" -UseBasicParsing -TimeoutSec 3).Content
  if ($hb -match '"connected":true') {
    Write-Host "A receiver window is already open — refreshing it (no duplicate)." -ForegroundColor Yellow
    try { Invoke-WebRequest "$base/reload" -Method POST -UseBasicParsing -TimeoutSec 3 | Out-Null } catch {}
    exit 0
  }
} catch {}

New-Item -ItemType Directory -Path $prof -Force | Out-Null

# Always open on the LEFTMOST monitor (Paul's left screen).
Add-Type -AssemblyName System.Windows.Forms
$left = [System.Windows.Forms.Screen]::AllScreens | Sort-Object { $_.Bounds.X } | Select-Object -First 1
$px = $left.Bounds.X + 40
$py = $left.Bounds.Y + 40
$pw = [Math]::Min(1240, $left.Bounds.Width - 80)
$ph = [Math]::Min(900,  $left.Bounds.Height - 80)

$chromeArgs = @(
  "--app=$url",
  "--autoplay-policy=no-user-gesture-required",
  "--user-data-dir=$prof",
  "--window-position=$px,$py",
  "--window-size=$pw,$ph",
  "--no-first-run",
  "--no-default-browser-check"
)
Write-Host "Opening $url on monitor at X=$($left.Bounds.X) (pos $px,$py)" -ForegroundColor Green
Start-Process "chrome.exe" -ArgumentList $chromeArgs
