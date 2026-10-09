/**
 * Story 8.3 (AVI-S8.3) — Bug 2 regression test.
 *
 * app.js registers a screen-level 'q'/'Q'/'C-c' handler that calls
 * process.exit(0). Blessed fires screen-level key handlers BEFORE
 * focused-element handlers, so without a modal guard this handler always
 * wins over a picker/modal's own Esc/q close binding — e.g. typing 'q' to
 * jump to a voice named "Quinn" in a picker would kill the whole TUI
 * instead of being handled by the picker, and 'q' would be unreachable
 * as a "close" key for any modal.
 *
 * The fix (app.js _registerHandlers, ~line 901) guards the quit behind
 * navigationService.isModalOpen(): when a modal is open, 'q'/'Q' must be
 * left for the focused element to handle. Ctrl+C always force-quits
 * regardless (it's the universal "get me out" signal).
 *
 * This test calls the REAL _registerHandlers() method (not a
 * reimplementation) with a stub screen that records the registered
 * handler, so it exercises the exact guard logic shipped in app.js.
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

const { AgentVibesConsole } = await import('../../src/console/app.js');
const { NavigationService } = await import('../../src/services/navigation-service.js');

/** Build an AgentVibesConsole instance wired with a capturing stub screen. */
function setup() {
  const app = new AgentVibesConsole();
  const capturedHandlers = {};
  app.screen = {
    key: (keys, handler) => {
      for (const k of Array.isArray(keys) ? keys : [keys]) capturedHandlers[k] = handler;
    },
    destroy: mock.fn(),
  };
  app.navigationService = new NavigationService();
  app._registerHandlers();
  return { app, capturedHandlers };
}

describe('AVI-8.3 bug 2 — global quit guarded by isModalOpen() (app.js)', () => {
  test('registers a single handler shared by q, Q, and C-c', () => {
    const { capturedHandlers } = setup();
    assert.strictEqual(typeof capturedHandlers['q'], 'function');
    assert.strictEqual(capturedHandlers['q'], capturedHandlers['Q']);
    assert.strictEqual(capturedHandlers['q'], capturedHandlers['C-c']);
  });

  test('no modal open: "q" destroys the screen and calls process.exit(0)', (t) => {
    const { app, capturedHandlers } = setup();
    const exitMock = t.mock.method(process, 'exit', () => {});

    assert.strictEqual(app.navigationService.isModalOpen(), false);
    capturedHandlers['q']('q', { name: 'q' });

    assert.strictEqual(app.screen.destroy.mock.callCount(), 1);
    assert.strictEqual(exitMock.mock.callCount(), 1);
    assert.deepStrictEqual(exitMock.mock.calls[0].arguments, [0]);
  });

  test('modal open: "q" is swallowed — screen is NOT destroyed and process does NOT exit', (t) => {
    const { app, capturedHandlers } = setup();
    const exitMock = t.mock.method(process, 'exit', () => {});

    app.navigationService.openModal(null);
    assert.strictEqual(app.navigationService.isModalOpen(), true);

    capturedHandlers['q']('q', { name: 'q' });

    assert.strictEqual(app.screen.destroy.mock.callCount(), 0,
      'the picker/modal must receive "q", not the global quit handler');
    assert.strictEqual(exitMock.mock.callCount(), 0);
  });

  test('modal open: "Q" (uppercase) is also swallowed', (t) => {
    const { app, capturedHandlers } = setup();
    const exitMock = t.mock.method(process, 'exit', () => {});

    app.navigationService.openModal(null);
    capturedHandlers['Q']('Q', { name: 'q', shift: true });

    assert.strictEqual(app.screen.destroy.mock.callCount(), 0);
    assert.strictEqual(exitMock.mock.callCount(), 0);
  });

  test('modal open: Ctrl+C still force-quits (no in-modal meaning to preserve)', (t) => {
    const { app, capturedHandlers } = setup();
    const exitMock = t.mock.method(process, 'exit', () => {});

    app.navigationService.openModal(null);
    assert.strictEqual(app.navigationService.isModalOpen(), true);

    capturedHandlers['C-c']('', { name: 'c', ctrl: true });

    assert.strictEqual(app.screen.destroy.mock.callCount(), 1,
      'Ctrl+C must always force-quit, even mid-modal');
    assert.strictEqual(exitMock.mock.callCount(), 1);
  });

  test('after modal closes, "q" resumes quitting normally', (t) => {
    const { app, capturedHandlers } = setup();
    const exitMock = t.mock.method(process, 'exit', () => {});

    app.navigationService.openModal(null);
    capturedHandlers['q']('q', { name: 'q' }); // swallowed
    assert.strictEqual(exitMock.mock.callCount(), 0);

    app.navigationService.closeModal();
    assert.strictEqual(app.navigationService.isModalOpen(), false);

    capturedHandlers['q']('q', { name: 'q' }); // now quits
    assert.strictEqual(app.screen.destroy.mock.callCount(), 1);
    assert.strictEqual(exitMock.mock.callCount(), 1);
  });
});
