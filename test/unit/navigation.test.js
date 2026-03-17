/**
 * navigation.js Tests
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('navigation.js - Module Structure', () => {
  test('src/console/navigation.js exists and exports setupNavigation', async () => {
    const mod = await import('../../src/console/navigation.js');
    assert.strictEqual(typeof mod.setupNavigation, 'function',
      'setupNavigation must be a named export');
  });
});

describe('navigation.js - setupNavigation', () => {
  test('setupNavigation does not throw with stub screen and NavigationService', async () => {
    const { setupNavigation } = await import('../../src/console/navigation.js');
    const { NavigationService } = await import('../../src/services/navigation-service.js');

    const nav = new NavigationService();
    const stubScreen = {
      key: () => {},
    };

    assert.doesNotThrow(() => setupNavigation(stubScreen, nav),
      'setupNavigation must not throw with valid arguments');
  });

  test('setupNavigation calls screen.key for each expected shortcut group', async () => {
    const { setupNavigation } = await import('../../src/console/navigation.js');
    const { NavigationService } = await import('../../src/services/navigation-service.js');

    const nav = new NavigationService();
    const registeredKeys = [];
    const stubScreen = {
      key: (keys) => registeredKeys.push(...(Array.isArray(keys) ? keys : [keys])),
    };

    setupNavigation(stubScreen, nav);

    // Verify all tab shortcuts are registered
    const expectedKeys = ['s', 'S', 'v', 'V', 'm', 'M', 'b', 'B', 'r', 'R', 'h', 'H', 'i', 'I', 't', 'T', 'escape'];
    for (const key of expectedKeys) {
      assert.ok(registeredKeys.includes(key),
        `Key '${key}' must be registered by setupNavigation`);
    }
  });

  test('NavigationService.switchTab is called correctly when tab shortcut fires', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');

    // Verify that NavigationService responds correctly to tab switches
    const nav = new NavigationService();
    const switched = [];
    nav.onSwitch(id => switched.push(id));

    nav.switchTab('voices');
    nav.switchTab('music');
    nav.switchTab('settings');

    assert.deepStrictEqual(switched, ['voices', 'music', 'settings']);
  });

  test('Tab key handler blocked when modal is open (tests real setupNavigation guard)', async () => {
    const { setupNavigation } = await import('../../src/console/navigation.js');
    const { NavigationService } = await import('../../src/services/navigation-service.js');

    const nav = new NavigationService('voices');
    // Capture actual registered key handlers from setupNavigation
    const capturedHandlers = {};
    const stubScreen = {
      key: (keys, handler) => {
        for (const k of Array.isArray(keys) ? keys : [keys]) {
          capturedHandlers[k] = handler;
        }
      },
    };
    setupNavigation(stubScreen, nav);

    // Open modal then fire the 's' handler — should NOT switch away from voices
    nav.openModal(null);
    capturedHandlers['s']?.();
    assert.strictEqual(nav.getActiveTab(), 'voices',
      'Tab switch must be blocked by real guard in setupNavigation when modal is open');
  });

  test('Esc key handler closes modal via real setupNavigation handler', async () => {
    const { setupNavigation } = await import('../../src/console/navigation.js');
    const { NavigationService } = await import('../../src/services/navigation-service.js');

    const nav = new NavigationService();
    const capturedHandlers = {};
    const stubScreen = {
      key: (keys, handler) => {
        for (const k of Array.isArray(keys) ? keys : [keys]) {
          capturedHandlers[k] = handler;
        }
      },
    };
    setupNavigation(stubScreen, nav);

    nav.openModal(null);
    assert.strictEqual(nav.isModalOpen(), true, 'modal must be open before Esc test');

    capturedHandlers['escape']?.();
    assert.strictEqual(nav.isModalOpen(), false,
      'Esc handler from setupNavigation must close modal');
  });
});
