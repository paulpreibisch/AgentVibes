# provider-catalog.ps1 — GENERATED FILE. DO NOT EDIT.
# DO NOT EDIT — generated from src/services/provider-catalog.js
# Regenerate with: node scripts/generate-provider-catalog.mjs
# content-hash: sha256:5e717024f1250a8f54d07291256e532606dba7b4a15ab9589305d1af6bba7f35
# Dot-source this file to load the catalog accessors; do not execute it.

$script:AgentVibesCatalogVersion = '5e717024f1250a8f'

$script:CatalogDefaults = @{
  'soprano' = 'soprano-default'
  'piper' = 'en_US-lessac-medium'
  'kokoro' = 'af_heart'
  'elevenlabs' = 'Sarah'
  'macos' = 'Samantha'
  'windows-sapi' = ''
  'windows-piper' = 'en_US-lessac-medium'
}

$script:CatalogDisplayNames = @{
  'soprano' = 'Soprano TTS'
  'piper' = 'Piper TTS'
  'kokoro' = 'Kokoro TTS'
  'elevenlabs' = 'ElevenLabs'
  'macos' = 'macOS Say'
  'windows-sapi' = 'Windows SAPI'
  'windows-piper' = 'Piper TTS'
}

$script:CatalogAlias = @{
  'macos-say' = 'macos'
  'say' = 'macos'
  'sapi' = 'windows-sapi'
}

$script:CatalogPlatform = @{
  'unix' = @('soprano','piper','kokoro','elevenlabs')
  'darwin' = @('soprano','piper','kokoro','elevenlabs','macos')
  'windows' = @('soprano','kokoro','windows-sapi','windows-piper')
}

$script:CatalogVoices = @{
  'soprano' = @('soprano-default')
  'piper' = @()
  'kokoro' = @('af_heart','af_alloy','af_aoede','af_bella','af_jessica','af_kore','af_nicole','af_nova','af_river','af_sarah','af_sky','am_adam','am_echo','am_eric','am_fenrir','am_liam','am_michael','am_onyx','am_puck','bf_alice','bf_emma','bf_isabella','bf_lily','bm_daniel','bm_fable','bm_george','bm_lewis','jf_alpha','jf_gongitsune','jf_nezumi','jf_tebukuro','jm_kumo','zf_xiaobei','zf_xiaoni','zf_xiaoxiao','zf_xiaoyi','zm_yunxi','zm_yunxia','zm_yunyang','ef_dora','em_alex','em_santa','ff_siwis','hf_alpha','hm_omega','if_sara','im_nicola','pf_dora','pm_alex','pm_santa','kf_alpha','km_hyunsu')
  'elevenlabs' = @('Sarah','Roger','Laura','Charlie','George','Callum','River','Harry','Liam','Alice','Matilda','Will','Jessica','Eric','Bella','Chris','Brian','Daniel','Lily','Adam','Bill')
  'macos' = @()
  'windows-sapi' = @()
  'windows-piper' = @()
}

$script:CatalogElevenLabs = @{
  'sarah' = 'EXAVITQu4vr4xnSDxMaL'
  'roger' = 'CwhRBWXzGAHq8TQ4Fs17'
  'laura' = 'FGY2WhTYpPnrIDTdsKH5'
  'charlie' = 'IKne3meq5aSn9XLyUdCD'
  'george' = 'JBFqnCBsd6RMkjVDRZzb'
  'callum' = 'N2lVS1w4EtoT3dr4eOWO'
  'river' = 'SAz9YHcvj6GT2YYXdXww'
  'harry' = 'SOYHLrjzK2X1ezoPC6cr'
  'liam' = 'TX3LPaxmHKxFdv7VOQHJ'
  'alice' = 'Xb7hH8MSUJpSbSDYk0k2'
  'matilda' = 'XrExE9yKIg1WjnnlVkGX'
  'will' = 'bIHbv24MWmeRgasZH58o'
  'jessica' = 'cgSgspJ2msm6clMCkdW9'
  'eric' = 'cjVigY5qzO86Huf0OWal'
  'bella' = 'hpp4J3VqNfWAUOO0d1Us'
  'chris' = 'iP95p4xoKVk53GoZ742B'
  'brian' = 'nPczCjzI2devNBz1zQrb'
  'daniel' = 'onwK4e9ZLuTAKqWW03F9'
  'lily' = 'pFZP5JQG7iQjIQuC4Bku'
  'adam' = 'pNInz6obpgDQGcFmaJgB'
  'bill' = 'pqHfZKP75CvOlQylNhV4'
}

function Get-CatalogCanonicalProvider {
  param([Parameter(Mandatory)][string]$Provider)
  $key = $Provider.Trim().ToLowerInvariant()
  if ($script:CatalogDefaults.ContainsKey($key)) { return $key }
  if ($script:CatalogAlias.ContainsKey($key)) { return $script:CatalogAlias[$key] }
  return $null
}

function Get-CatalogDefaultVoice {
  param([Parameter(Mandatory)][string]$Provider)
  $p = Get-CatalogCanonicalProvider $Provider
  if ($null -eq $p) { return $null }
  return $script:CatalogDefaults[$p]
}

function Get-CatalogDisplayName {
  param([Parameter(Mandatory)][string]$Provider)
  $p = Get-CatalogCanonicalProvider $Provider
  if ($null -eq $p) { return $Provider }
  return $script:CatalogDisplayNames[$p]
}

function Get-CatalogProvidersForPlatform {
  param([Parameter(Mandatory)][string]$Platform)
  $key = $Platform.Trim().ToLowerInvariant()
  if ($script:CatalogPlatform.ContainsKey($key)) { return $script:CatalogPlatform[$key] }
  return @()
}

function Get-CatalogVoices {
  param([Parameter(Mandatory)][string]$Provider)
  $p = Get-CatalogCanonicalProvider $Provider
  if ($null -eq $p) { return @() }
  return $script:CatalogVoices[$p]
}

function Test-CatalogVoice {
  param([Parameter(Mandatory)][string]$Provider, [Parameter(Mandatory)][AllowEmptyString()][string]$Voice)
  $p = Get-CatalogCanonicalProvider $Provider
  if ($null -eq $p) { return $null }
  $lc = $Voice.Trim().ToLowerInvariant()
  switch ($p) {
    'kokoro' {
      if ($script:CatalogVoices['kokoro'] -contains $lc) { return $lc }
      return $null
    }
    'elevenlabs' {
      if ($script:CatalogElevenLabs.ContainsKey($lc)) { return $script:CatalogElevenLabs[$lc] }
      if ($Voice -match '^[A-Za-z0-9]{20}$') { return $Voice }
      return $null
    }
    'soprano' {
      if ($lc -eq '' -or $lc -eq 'soprano' -or $lc -eq 'soprano-default') { return 'soprano-default' }
      return $null
    }
    { $_ -eq 'piper' -or $_ -eq 'windows-piper' } {
      if ($Voice -match '^[a-z]{2,3}_[A-Z]{2}-' -or $Voice -like '*::*') { return $Voice }
      return $null
    }
    default {
      if ($Voice -ne '') { return $Voice }
      if ($p -eq 'windows-sapi') { return '' }
      return $null
    }
  }
}
