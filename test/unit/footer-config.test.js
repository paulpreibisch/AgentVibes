/**
 * Footer Config Tests
 * Story 6.3: Color-Coded Context Footer System
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('footer-config.js - Module Structure', () => {
  test('src/console/footer-config.js exports FOOTER_CONFIG', async () => {
    const mod = await import('../../src/console/footer-config.js');
    assert.ok(typeof mod.FOOTER_CONFIG === 'object' && mod.FOOTER_CONFIG !== null,
      'FOOTER_CONFIG must be a named export object');
  });

  test('src/console/footer-config.js exports DEFAULT_FOOTER_COLOR', async () => {
    const { DEFAULT_FOOTER_COLOR } = await import('../../src/console/footer-config.js');
    assert.strictEqual(typeof DEFAULT_FOOTER_COLOR, 'string',
      'DEFAULT_FOOTER_COLOR must be a string');
    assert.ok(DEFAULT_FOOTER_COLOR.startsWith('#'),
      'DEFAULT_FOOTER_COLOR must be a hex color string');
  });
});

describe('footer-config.js - All 7 tabs covered', () => {
  test('FOOTER_CONFIG has entries for all 7 tab IDs', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    const required = ['settings', 'voices', 'music', 'agents', 'readme', 'help', 'install'];
    for (const tabId of required) {
      assert.ok(Object.hasOwn(FOOTER_CONFIG, tabId),
        `FOOTER_CONFIG must have an entry for tab '${tabId}'`);
    }
  });

  test('Every FOOTER_CONFIG entry has a color property (hex string)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    for (const [tabId, config] of Object.entries(FOOTER_CONFIG)) {
      assert.ok(typeof config.color === 'string' && config.color.startsWith('#'),
        `FOOTER_CONFIG['${tabId}'].color must be a hex color string`);
    }
  });

  test('Every FOOTER_CONFIG entry has a text property (string)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    for (const [tabId, config] of Object.entries(FOOTER_CONFIG)) {
      assert.ok(typeof config.text === 'string',
        `FOOTER_CONFIG['${tabId}'].text must be a string`);
    }
  });
});

describe('footer-config.js - Correct colors per tab (AC#2)', () => {
  test('Settings footer color is #2196f3 (blue)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.strictEqual(FOOTER_CONFIG.settings.color, '#2196f3');
  });

  test('Voices footer color is #00bcd4 (cyan)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.strictEqual(FOOTER_CONFIG.voices.color, '#00bcd4');
  });

  test('Music footer color is #ff9800 (orange)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.strictEqual(FOOTER_CONFIG.music.color, '#ff9800');
  });

  test('Agents footer color is #9c27b0 (purple)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.strictEqual(FOOTER_CONFIG.agents.color, '#9c27b0');
  });

  test('Help footer color is #607d8b (gray)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.strictEqual(FOOTER_CONFIG.help.color, '#607d8b');
  });

  test('Readme footer color is #455a64 (dark gray)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.strictEqual(FOOTER_CONFIG.readme.color, '#455a64');
  });

  test('Install footer color is #1a237e (dark navy)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.strictEqual(FOOTER_CONFIG.install.color, '#1a237e');
  });
});

describe('footer-config.js - Text content per tab (AC#3)', () => {
  test('Settings footer text includes navigation shortcuts', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.ok(FOOTER_CONFIG.settings.text.includes('Navigate') ||
              FOOTER_CONFIG.settings.text.includes('↑↓'),
      'Settings footer must mention navigation');
  });

  test('Voices footer text includes Sort and Search shortcuts', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.ok(FOOTER_CONFIG.voices.text.includes('Sort'),
      'Voices footer must mention Sort');
    assert.ok(FOOTER_CONFIG.voices.text.includes('Search') ||
              FOOTER_CONFIG.voices.text.includes('/'),
      'Voices footer must mention Search or /');
  });

  test('Music footer text includes Preview, Toggle, and Navigate shortcuts', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.ok(FOOTER_CONFIG.music.text.includes('Preview'), 'Music footer must mention Preview');
    assert.ok(FOOTER_CONFIG.music.text.includes('Toggle'), 'Music footer must mention Toggle');
    assert.ok(FOOTER_CONFIG.music.text.includes('Navigate') ||
              FOOTER_CONFIG.music.text.includes('↑↓'),
      'Music footer must mention Navigate');
  });

  test('Agents footer text includes Navigate, Assign, and Reset shortcuts', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.ok(FOOTER_CONFIG.agents.text.includes('Navigate') ||
              FOOTER_CONFIG.agents.text.includes('↑↓'),
      'Agents footer must mention Navigate');
    assert.ok(FOOTER_CONFIG.agents.text.includes('Assign'), 'Agents footer must mention Assign');
    assert.ok(FOOTER_CONFIG.agents.text.includes('Reset'), 'Agents footer must mention Reset');
  });

  test('Readme footer text includes Scroll and Page shortcuts', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.ok(FOOTER_CONFIG.readme.text.includes('Scroll'), 'Readme footer must mention Scroll');
    assert.ok(FOOTER_CONFIG.readme.text.includes('Page') ||
              FOOTER_CONFIG.readme.text.includes('PgUp'),
      'Readme footer must mention Page/PgUp');
  });

  test('Help footer text includes Scroll and Quit shortcuts', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.ok(FOOTER_CONFIG.help.text.includes('Scroll'), 'Help footer must mention Scroll');
    assert.ok(FOOTER_CONFIG.help.text.includes('Quit') ||
              FOOTER_CONFIG.help.text.includes('Q'),
      'Help footer must mention Quit/Q');
  });

  test('Install footer text includes Navigate, Select, and Back shortcuts', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    assert.ok(FOOTER_CONFIG.install.text.includes('Navigate') ||
              FOOTER_CONFIG.install.text.includes('↑↓'),
      'Install footer must mention Navigate');
    assert.ok(FOOTER_CONFIG.install.text.includes('Select'), 'Install footer must mention Select');
    assert.ok(FOOTER_CONFIG.install.text.includes('Back') ||
              FOOTER_CONFIG.install.text.includes('Esc'),
      'Install footer must mention Back/Esc');
  });

  test('Footer text entries are non-empty', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    for (const [tabId, config] of Object.entries(FOOTER_CONFIG)) {
      assert.ok(config.text.trim().length > 0,
        `FOOTER_CONFIG['${tabId}'].text must not be empty`);
    }
  });
});

describe('footer-config.js - TAB_ORDER alignment (L2)', () => {
  test('FOOTER_CONFIG keys align exactly with TAB_ORDER (bidirectional)', async () => {
    const { FOOTER_CONFIG } = await import('../../src/console/footer-config.js');
    const { TAB_ORDER } = await import('../../src/services/navigation-service.js');
    for (const tabId of TAB_ORDER) {
      assert.ok(Object.hasOwn(FOOTER_CONFIG, tabId),
        `FOOTER_CONFIG must have entry for TAB_ORDER tab '${tabId}'`);
    }
    for (const tabId of Object.keys(FOOTER_CONFIG)) {
      assert.ok(TAB_ORDER.includes(tabId),
        `FOOTER_CONFIG key '${tabId}' not in TAB_ORDER — remove or add to TAB_ORDER`);
    }
  });
});
