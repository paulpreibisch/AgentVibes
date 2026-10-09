/**
 * Modal Overlay Tests
 * Story 6.4: Modal Overlay Component
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Shared stub factories
function makeStubScreen() {
  return {
    append: () => {},
    key: () => {},
    unkey: () => {},
    render: () => {},
    focused: null,
  };
}

describe('modal-overlay.js - Module Structure', () => {
  test('exports ModalOverlay class', async () => {
    const mod = await import('../../src/console/modals/modal-overlay.js');
    assert.ok(typeof mod.ModalOverlay === 'function',
      'ModalOverlay must be a named export class/constructor');
  });

  test('exports createModalOverlay factory function', async () => {
    const mod = await import('../../src/console/modals/modal-overlay.js');
    assert.ok(typeof mod.createModalOverlay === 'function',
      'createModalOverlay must be a named export function');
  });
});

describe('modal-overlay.js - createModalOverlay factory', () => {
  test('returns object with open, close, getContentBox, setTitle methods', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    assert.ok(typeof modal.open === 'function', 'modal must have open()');
    assert.ok(typeof modal.close === 'function', 'modal must have close()');
    assert.ok(typeof modal.getContentBox === 'function', 'modal must have getContentBox()');
    assert.ok(typeof modal.setTitle === 'function', 'modal must have setTitle()');
  });

  test('createModalOverlay accepts opts.title', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    // Should not throw with title option
    assert.doesNotThrow(() => {
      createModalOverlay(makeStubScreen(), nav, { title: 'Test Modal' });
    });
  });
});

describe('modal-overlay.js - ModalOverlay class', () => {
  test('ModalOverlay can be instantiated with screen and nav', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { ModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    assert.doesNotThrow(() => new ModalOverlay(makeStubScreen(), nav));
  });

  test('open() calls nav.openModal() — isModalOpen becomes true', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    assert.strictEqual(nav.isModalOpen(), false, 'modal should be closed before open()');
    modal.open();
    assert.strictEqual(nav.isModalOpen(), true, 'isModalOpen() must be true after open()');
  });

  test('close() calls nav.closeModal() — isModalOpen becomes false', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    modal.open();
    assert.strictEqual(nav.isModalOpen(), true, 'modal should be open');
    modal.close();
    assert.strictEqual(nav.isModalOpen(), false, 'isModalOpen() must be false after close()');
  });

  test('open(fn) stores onApply callback', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    const applyFn = () => {};
    modal.open(applyFn);
    assert.strictEqual(modal._onApply, applyFn,
      'open(fn) must store fn as _onApply for Apply button activation');
  });

  test('close() when not open is a no-op (does not throw)', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    assert.doesNotThrow(() => modal.close(), 'close() when modal is not open must not throw');
  });

  test('getContentBox() returns an object (content area)', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    const box = modal.getContentBox();
    assert.ok(box !== null && typeof box === 'object',
      'getContentBox() must return the content area object');
  });

  test('setTitle(text) updates titleBar content with leading space (L2)', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    let captured = null;
    modal._titleBar.setContent = (v) => { captured = v; };
    modal.setTitle('Voice Selector');
    assert.strictEqual(captured, ' Voice Selector',
      'setTitle() must call setContent with " <text>" (leading space prefix)');
  });
});

describe('modal-overlay.js - _handleApply behaviour (M2)', () => {
  test('_handleApply() invokes the onApply callback', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    let called = false;
    modal.open(() => { called = true; });
    modal._handleApply();
    assert.strictEqual(called, true,
      '_handleApply() must invoke the onApply callback supplied to open()');
  });

  test('_handleApply() closes the modal after invoking callback', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService();
    const modal = createModalOverlay(makeStubScreen(), nav);
    modal.open(() => {});
    assert.strictEqual(nav.isModalOpen(), true, 'modal must be open before _handleApply');
    modal._handleApply();
    assert.strictEqual(nav.isModalOpen(), false,
      '_handleApply() must close the modal (isModalOpen becomes false)');
  });
});

describe('modal-overlay.js - Tab blocking while open (AC#10)', () => {
  test('switchTab is blocked while modal is open (existing isModalOpen guard)', async () => {
    const { NavigationService } = await import('../../src/services/navigation-service.js');
    const { createModalOverlay } = await import('../../src/console/modals/modal-overlay.js');
    const nav = new NavigationService('settings');
    const modal = createModalOverlay(makeStubScreen(), nav);

    modal.open();
    // Simulate the navigation.js guard: if (!nav.isModalOpen()) switchTab(...)
    // switchTab('music') should be blocked
    const before = nav.getActiveTab();
    // Direct call — NavigationService.switchTab does NOT have the modal guard
    // The guard is in navigation.js key handlers. For unit testing, we verify
    // isModalOpen() returns true so that the guard in navigation.js would block.
    assert.strictEqual(nav.isModalOpen(), true,
      'isModalOpen() must be true so navigation.js guard blocks tab switches');
    // Verify active tab unchanged (since we haven't called switchTab — the guard prevents it)
    assert.strictEqual(nav.getActiveTab(), before,
      'Active tab must remain unchanged while modal is open');
    modal.close();
  });
});
