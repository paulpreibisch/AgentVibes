/**
 * NavigationService Tests
 * Story 6.2: Tab Bar & Global Keyboard Navigation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('NavigationService - Module Structure', () => {
  test('src/services/navigation-service.js exists and exports NavigationService', async () => {
    const mod = await import('../../src/services/navigation-service.js');
    assert.strictEqual(typeof mod.NavigationService, 'function',
      'NavigationService must be a named export');
  });

  test('TAB_ORDER is exported from navigation-service.js', async () => {
    const { TAB_ORDER } = await import('../../src/services/navigation-service.js');
    assert.ok(Array.isArray(TAB_ORDER), 'TAB_ORDER must be an array');
    assert.ok(TAB_ORDER.length === 8, 'TAB_ORDER must have 8 tabs');
  });

  test('TAB_ORDER contains all required tab IDs', async () => {
    const { TAB_ORDER } = await import('../../src/services/navigation-service.js');
    const required = ['settings', 'voices', 'music', 'agents', 'receiver', 'readme', 'help', 'setup'];
    for (const id of required) {
      assert.ok(TAB_ORDER.includes(id), `TAB_ORDER must include '${id}'`);
    }
  });
});

describe('NavigationService - Initial State', () => {
  test('getActiveTab defaults to "settings"', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    assert.strictEqual(nav.getActiveTab(), 'settings');
  });

  test('getActiveTab respects constructor initialTab', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('voices');
    assert.strictEqual(nav.getActiveTab(), 'voices');
  });

  test('isModalOpen returns false initially', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    assert.strictEqual(nav.isModalOpen(), false);
  });
});

describe('NavigationService - switchTab', () => {
  test('switchTab changes active tab', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    nav.switchTab('voices');
    assert.strictEqual(nav.getActiveTab(), 'voices');
  });

  test('switchTab ignores invalid tab IDs', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    nav.switchTab('nonexistent');
    assert.strictEqual(nav.getActiveTab(), 'settings', 'Invalid tab should not change active tab');
  });

  test('switchTab does not fire callbacks for same-tab switch (M3 fix)', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('settings');
    let callCount = 0;
    nav.onSwitch(() => { callCount++; });
    nav.switchTab('settings'); // same tab — should be no-op
    assert.strictEqual(callCount, 0,
      'onSwitch callbacks must NOT fire when switching to the same tab already active');
  });

  test('switchTab fires onSwitch callbacks', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    let called = null;
    nav.onSwitch(tabId => { called = tabId; });
    nav.switchTab('music');
    assert.strictEqual(called, 'music');
  });

  test('switchTab fires multiple onSwitch callbacks', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    const calls = [];
    nav.onSwitch(id => calls.push('cb1:' + id));
    nav.onSwitch(id => calls.push('cb2:' + id));
    nav.switchTab('help');
    assert.deepStrictEqual(calls, ['cb1:help', 'cb2:help']);
  });
});

describe('NavigationService - forceActivate (H1 fix)', () => {
  test('forceActivate fires callbacks even when tab is already active', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('settings');
    let callCount = 0;
    nav.onSwitch(() => { callCount++; });
    nav.forceActivate('settings'); // same tab — must still fire
    assert.strictEqual(callCount, 1,
      'forceActivate must fire onSwitch callbacks even for the already-active tab');
  });

  test('forceActivate updates _activeTab', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('settings');
    nav.forceActivate('voices');
    assert.strictEqual(nav.getActiveTab(), 'voices',
      'forceActivate must update _activeTab to the given tab');
  });

  test('forceActivate fires callback with correct tabId', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('settings');
    let received = null;
    nav.onSwitch(id => { received = id; });
    nav.forceActivate('music');
    assert.strictEqual(received, 'music',
      'forceActivate must pass the tabId to onSwitch callbacks');
  });

  test('forceActivate ignores invalid tab IDs', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('settings');
    let callCount = 0;
    nav.onSwitch(() => { callCount++; });
    nav.forceActivate('nonexistent');
    assert.strictEqual(callCount, 0, 'forceActivate must ignore invalid tab IDs');
    assert.strictEqual(nav.getActiveTab(), 'settings', 'Active tab must remain unchanged');
  });
});

describe('NavigationService - cycleTab', () => {
  test('cycleTab advances to next tab', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('settings');
    nav.cycleTab();
    assert.strictEqual(nav.getActiveTab(), 'voices');
  });

  test('cycleTab wraps from last tab (help) to first (setup)', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('help');
    nav.cycleTab();
    assert.strictEqual(nav.getActiveTab(), 'setup');
  });

  test('cycleTab fires onSwitch callback', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService('settings');
    let fired = null;
    nav.onSwitch(id => { fired = id; });
    nav.cycleTab();
    assert.strictEqual(fired, 'voices');
  });
});

describe('NavigationService - Modal State', () => {
  test('openModal sets isModalOpen to true', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    nav.openModal(null);
    assert.strictEqual(nav.isModalOpen(), true);
  });

  test('closeModal sets isModalOpen to false', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    nav.openModal(null);
    nav.closeModal();
    assert.strictEqual(nav.isModalOpen(), false);
  });

  test('openModal calls factory function if provided', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    let factoryCalled = false;
    nav.openModal(() => { factoryCalled = true; });
    assert.ok(factoryCalled, 'factory function must be called by openModal');
  });
});

describe('NavigationService - Focus Stack', () => {
  test('pushFocus and popFocus work as a stack (LIFO)', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    const el1 = { id: 'el1' };
    const el2 = { id: 'el2' };
    nav.pushFocus(el1);
    nav.pushFocus(el2);
    assert.strictEqual(nav.popFocus(), el2, 'popFocus must return last pushed element');
    assert.strictEqual(nav.popFocus(), el1, 'popFocus must return previous element');
  });

  test('popFocus returns undefined on empty stack', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const nav = new NavigationService();
    assert.strictEqual(nav.popFocus(), undefined, 'popFocus on empty stack must return undefined');
  });
});
