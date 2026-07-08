#!/usr/bin/env node
/**
 * Canonical voice resolver for catalog-based providers.
 *
 * Given a provider and a user-supplied voice (friendly name OR raw id), print
 * the canonical id on success (exit 0) or exit non-zero if it is not a valid
 * voice for that provider. This is the SINGLE SOURCE OF TRUTH used by
 * voice-manager.sh so the shell dispatchers never carry a divergent copy of the
 * catalogs (provider-voice-catalog.js).
 *
 * Usage:  node resolve-voice.js <provider> <voiceNameOrId>
 *   provider ∈ { elevenlabs, kokoro }
 *
 * Matching is case-insensitive on both name and id. For ElevenLabs the printed
 * value is the raw voice_id (which play-tts-elevenlabs.sh accepts directly),
 * sidestepping any name-map divergence between the catalog and the hook.
 */
import { KOKORO_VOICE_IDS, ELEVENLABS_VOICES } from '../services/provider-voice-catalog.js';

const provider = (process.argv[2] || '').toLowerCase();
const query = (process.argv[3] || '').trim();

if (!query) process.exit(2); // no voice supplied — caller treats as "not found"

const lc = query.toLowerCase();

if (provider === 'elevenlabs') {
  const match = ELEVENLABS_VOICES.find(
    (v) => v.name.toLowerCase() === lc || v.id.toLowerCase() === lc,
  );
  if (!match) process.exit(1);
  process.stdout.write(match.id); // canonical voice_id
  process.exit(0);
}

if (provider === 'kokoro') {
  const match = KOKORO_VOICE_IDS.find((id) => id.toLowerCase() === lc);
  if (!match) process.exit(1);
  process.stdout.write(match);
  process.exit(0);
}

process.exit(3); // unknown provider for this resolver
