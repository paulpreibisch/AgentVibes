/**
 * AgentVibes Console App Scaffold Tests
 * Story 6.1: Blessed.js App Scaffold & Screen Setup
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Note: ESM module mocking (intercepting blessed.screen()) requires
// --experimental-vm-modules which is not enabled by default. Instead, app.js
// exposes this._screenOptions so tests can verify screen configuration without
// needing to intercept the blessed.screen() call.

describe('AgentVibesConsole - Module Structure', () => {
  test('src/console/app.js exists and exports launchConsole', async () => {
    const appModule = await import('../../src/console/app.js');
    assert.strictEqual(typeof appModule.launchConsole, 'function',
      'launchConsole must be a named export');
  });

  test('src/console/app.js exports AgentVibesConsole class', async () => {
    const appModule = await import('../../src/console/app.js');
    assert.strictEqual(typeof appModule.AgentVibesConsole, 'function',
      'AgentVibesConsole class must be a named export');
  });

  test('AgentVibesConsole constructor stores startTab option', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ startTab: 'voices' });
    assert.strictEqual(instance.startTab, 'voices',
      'startTab from opts must be stored on instance');
  });

  test('AgentVibesConsole constructor defaults startTab to settings', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole();
    assert.strictEqual(instance.startTab, 'settings',
      'startTab must default to "settings" when not provided');
  });

  test('tabBarBox is null before init and populated after init', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    assert.strictEqual(instance.tabBarBox, null, 'tabBarBox must be null before init');
    await instance.init();
    assert.ok(instance.tabBarBox !== null && instance.tabBarBox !== undefined,
      'tabBarBox must be set after init (story 6.2 depends on this)');
  });

  test('contentArea is null before init and populated after init', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    assert.strictEqual(instance.contentArea, null, 'contentArea must be null before init');
    await instance.init();
    assert.ok(instance.contentArea !== null && instance.contentArea !== undefined,
      'contentArea must be set after init (story 6.2 tab mounting depends on this)');
  });

  test('screen is created with correct options (AC #1)', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    await instance.init();
    assert.strictEqual(instance._screenOptions.smartCSR, true, 'smartCSR must be true');
    assert.strictEqual(instance._screenOptions.mouse, true, 'mouse must be true');
    assert.strictEqual(instance._screenOptions.fullUnicode, true, 'fullUnicode must be true');
    assert.strictEqual(instance._screenOptions.title, 'AgentVibes v4.0 TUI Console',
      'title must match spec');
  });

  test('launchConsole accepts opts object with startTab and returns console instance', async () => {
    const { launchConsole } = await import('../../src/console/app.js');
    // Use _testMode: true to prevent blessed from entering interactive event loop
    const instance = await launchConsole({ startTab: 'install', _testMode: true });
    assert.ok(instance, 'launchConsole must return an instance');
    assert.strictEqual(instance.startTab, 'install',
      'returned instance must have startTab from opts');
    assert.ok(instance.tabBarBox !== null && instance.tabBarBox !== undefined,
      'returned instance must have tabBarBox set after init');
    assert.ok(instance.contentArea !== null && instance.contentArea !== undefined,
      'returned instance must have contentArea set after init');
  });
});

describe('AgentVibesConsole - Context Footer (Story 6.3)', () => {
  test('contextFooterBox is null before init and populated after init', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    assert.strictEqual(instance.contextFooterBox, null,
      'contextFooterBox must be null before init');
    await instance.init();
    assert.ok(instance.contextFooterBox !== null && instance.contextFooterBox !== undefined,
      'contextFooterBox must be set after init (story 6.3 depends on this)');
  });

  test('_updateContextFooter sets bg color matching FOOTER_CONFIG for voices tab', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    await instance.init();
    let capturedText = null;
    instance.contextFooterBox = {
      style: { bg: '' },
      setContent: (t) => { capturedText = t; },
    };
    instance._updateContextFooter('voices');
    assert.strictEqual(instance.contextFooterBox.style.bg, '#00bcd4',
      '_updateContextFooter must set #00bcd4 for voices tab (AC#2)');
    assert.ok(typeof capturedText === 'string' && capturedText.length > 0,
      '_updateContextFooter must set non-empty text for voices tab (AC#3)');
  });

  test('_updateContextFooter uses DEFAULT_FOOTER_COLOR for unknown tabId', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const { DEFAULT_FOOTER_COLOR } = await import('../../src/console/footer-config.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    await instance.init();
    instance.contextFooterBox = {
      style: { bg: '' },
      setContent: () => {},
    };
    instance._updateContextFooter('unknown-tab-id');
    assert.strictEqual(instance.contextFooterBox.style.bg, DEFAULT_FOOTER_COLOR,
      '_updateContextFooter must fall back to DEFAULT_FOOTER_COLOR for unknown tab');
  });
});

describe('AgentVibesConsole - Navigation (Story 6.2)', () => {
  test('navigationService is null before init and a NavigationService instance after init', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    assert.strictEqual(instance.navigationService, null,
      'navigationService must be null before init');
    await instance.init();
    assert.ok(instance.navigationService instanceof NavigationService,
      'navigationService must be a NavigationService instance after init (story 6.3 depends on this)');
  });

  test('navigationService.getActiveTab() equals startTab after init', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ startTab: 'voices', _testMode: true });
    await instance.init();
    assert.strictEqual(instance.navigationService.getActiveTab(), 'voices',
      'navigationService active tab must match startTab option');
  });

  test('_renderTabBarContent includes all 7 tab shortcut labels', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    await instance.init();
    const content = instance._renderTabBarContent('settings');
    const expectedShortcuts = ['[S]', '[V]', '[M]', '[A]', '[R]', '[H]', '[I]'];
    for (const shortcut of expectedShortcuts) {
      assert.ok(content.includes(shortcut),
        `Tab bar content must include shortcut '${shortcut}' (AC#1)`);
    }
  });

  test('_renderTabBarContent marks active tab with bold tag (AC#2)', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    await instance.init();
    const content = instance._renderTabBarContent('voices');
    assert.ok(content.includes('{bold}') && content.includes('Voices'),
      'Active tab must have {bold} tag (AC#2 active tab highlight)');
  });

  test('_renderTabBarContent marks active tab with #3949ab background (AC#2)', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ _testMode: true });
    await instance.init();
    const content = instance._renderTabBarContent('music');
    assert.ok(content.includes('#3949ab'),
      'Active tab must use #3949ab background color (AC#2)');
  });
});

describe('AgentVibesConsole - Directory Structure', () => {
  test('src/console/ directory exists', async () => {
    const fs = await import('node:fs/promises');
    const stat = await fs.stat('src/console');
    assert.ok(stat.isDirectory(), 'src/console/ must be a directory');
  });

  test('src/console/tabs/ directory exists', async () => {
    const fs = await import('node:fs/promises');
    const stat = await fs.stat('src/console/tabs');
    assert.ok(stat.isDirectory(), 'src/console/tabs/ must exist for story 6.2');
  });

  test('src/console/modals/ directory exists', async () => {
    const fs = await import('node:fs/promises');
    const stat = await fs.stat('src/console/modals');
    assert.ok(stat.isDirectory(), 'src/console/modals/ must exist for story 6.4');
  });

  test('src/services/ directory exists', async () => {
    const fs = await import('node:fs/promises');
    const stat = await fs.stat('src/services');
    assert.ok(stat.isDirectory(), 'src/services/ must exist for service stories');
  });
});

describe('AgentVibesConsole - startTab Options', () => {
  test('startTab "install" is stored correctly', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ startTab: 'install' });
    assert.strictEqual(instance.startTab, 'install');
  });

  test('startTab "music" is stored correctly', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ startTab: 'music' });
    assert.strictEqual(instance.startTab, 'music');
  });

  test('startTab null falls back to "settings"', async () => {
    const { AgentVibesConsole } = await import('../../src/console/app.js');
    const instance = new AgentVibesConsole({ startTab: null });
    // null should be treated as falsy → fall back to 'settings'
    assert.strictEqual(instance.startTab, 'settings');
  });
});
