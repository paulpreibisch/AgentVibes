#
# send-test.ps1 — send a test message to the AgentVibes HTML Receiver.
# Generates a SAPI voice clip and POSTs it to /speak so an avatar speaks it.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File send-test.ps1 "Hello there"
#   powershell -ExecutionPolicy Bypass -File send-test.ps1 "Hi" -Project myapp -Voice af_nova -Sapi "Microsoft Zira"
#
param(
  [Parameter(Position=0)][string]$Text = "Hello from AgentVibes. This is a test of the talking head receiver.",
  [string]$Project = "AgentVibes",
  [string]$Voice   = "af_nova",          # logical voice (drives avatar mapping/colour)
  [string]$Sapi    = "Microsoft David",  # actual SAPI voice used to synthesize
  [string]$Llm     = "claude-code",
  [string]$Origin  = "ubuntu-rdp",
  [int]$Port = 3747
)
Add-Type -AssemblyName System.Speech
$tmp = "$env:TEMP\av-test-$([guid]::NewGuid().ToString('N').Substring(0,6)).wav"
$syn = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $syn.SelectVoice($Sapi) } catch {}
$syn.SetOutputToWaveFile($tmp); $syn.Speak($Text); $syn.Dispose()
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($tmp))
$body = @{ audioBase64=$b64; text=$Text; voice=$Voice; project=$Project; origin=$Origin; llm=$Llm } | ConvertTo-Json -Compress
try {
  $r = Invoke-WebRequest "http://localhost:$Port/speak" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
  Write-Host "Sent to $Project (voice=$Voice): $($r.Content)" -ForegroundColor Green
} catch { Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red }
Remove-Item $tmp -ErrorAction SilentlyContinue
