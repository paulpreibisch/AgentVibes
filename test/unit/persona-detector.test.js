/**
 * File: test/unit/persona-detector.test.js
 *
 * Unit tests for persona detection functionality
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { detectPersona } from '../../src/utils/persona-detector.js';

describe('Persona Detector', () => {
  let testDir;

  // Setup: Create temp directory
  test('setup', async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentvibes-test-'));
  });

  test('detects persona from valid IDENTITY.md', async () => {
    const identityContent = `# IDENTITY.md - Who Am I?

- **Name:** TestBot
- **Creature:** AI Assistant
- **Vibe:** warm and friendly
- **Emoji:** 🤖
`;

    await fs.writeFile(path.join(testDir, 'IDENTITY.md'), identityContent);

    const persona = await detectPersona(testDir);

    assert.equal(persona.detected, true);
    assert.equal(persona.name, 'TestBot');
    assert.equal(persona.creature, 'AI Assistant');
    assert.equal(persona.vibe, 'warm and friendly');
    assert.equal(persona.emoji, '🤖');
    assert.equal(persona.voice, 'en_US-amy-medium'); // warm → amy
  });

  test('maps energetic vibe to ryan-high voice', async () => {
    const identityContent = `# IDENTITY.md

- **Name:** EnergyBot
- **Vibe:** energetic and enthusiastic
- **Emoji:** ⚡
`;

    await fs.writeFile(path.join(testDir, 'IDENTITY.md'), identityContent);

    const persona = await detectPersona(testDir);

    assert.equal(persona.voice, 'en_US-ryan-high');
    assert.equal(persona.speed, 1.1);
    assert.equal(persona.personality, 'funny');
  });

  test('maps professional vibe to lessac-medium voice', async () => {
    const identityContent = `# IDENTITY.md

- **Name:** ProBot
- **Vibe:** professional and formal
- **Emoji:** 💼
`;

    await fs.writeFile(path.join(testDir, 'IDENTITY.md'), identityContent);

    const persona = await detectPersona(testDir);

    assert.equal(persona.voice, 'en_US-lessac-medium');
    assert.equal(persona.personality, 'professional');
  });

  test('maps sarcastic vibe to ryan-medium voice', async () => {
    const identityContent = `# IDENTITY.md

- **Name:** SassBot
- **Vibe:** witty and sarcastic
- **Emoji:** 😏
`;

    await fs.writeFile(path.join(testDir, 'IDENTITY.md'), identityContent);

    const persona = await detectPersona(testDir);

    assert.equal(persona.voice, 'en_US-ryan-medium');
    assert.equal(persona.personality, 'sarcastic');
  });

  test('returns defaults when IDENTITY.md missing', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentvibes-empty-'));

    const persona = await detectPersona(emptyDir);

    assert.equal(persona.detected, false);
    assert.equal(persona.name, 'Assistant');
    assert.equal(persona.voice, 'en_US-amy-medium');
    assert.equal(persona.speed, 1.0);
    assert.equal(persona.source, null);

    // Cleanup
    await fs.rm(emptyDir, { recursive: true, force: true });
  });

  test('handles malformed IDENTITY.md gracefully', async () => {
    const malformedContent = `This is not valid IDENTITY.md format
Just random text here
No bullet points`;

    await fs.writeFile(path.join(testDir, 'IDENTITY.md'), malformedContent);

    const persona = await detectPersona(testDir);

    // Should still detect file but use defaults for missing fields
    assert.equal(persona.detected, true);
    assert.equal(persona.name, 'Assistant'); // Default when name not parsed
    assert.equal(persona.voice, 'en_US-amy-medium'); // Default voice
  });

  test('maps zen vibe to kimberly-low voice', async () => {
    const identityContent = `# IDENTITY.md

- **Name:** CalmBot
- **Vibe:** calm and zen
- **Emoji:** 🧘
`;

    await fs.writeFile(path.join(testDir, 'IDENTITY.md'), identityContent);

    const persona = await detectPersona(testDir);

    assert.equal(persona.voice, 'en_US-kimberly-low');
    assert.equal(persona.speed, 0.9);
    assert.equal(persona.personality, 'zen');
  });

  // Cleanup: Remove temp directory
  test('cleanup', async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
});
