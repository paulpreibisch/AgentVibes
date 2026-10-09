/**
 * Unit coverage for the shared preview transport badge + row spinner
 * (src/console/preview-transport.js), used identically by every music & voice
 * preview surface so they can't drift.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  transportBadge, previewRowContent, createRowSpinner, SPIN_FRAMES, padTaggedTo,
} from '../../src/console/preview-transport.js';

describe('createRowSpinner — out-of-range guard (no TUI crash on a shrunk list)', () => {
  // blessed's List.setItem dereferences items[i] unchecked; a stale spinner index
  // after a filter rebuild used to throw an uncaught TypeError and kill the TUI.
  function strictList(items) {
    return { items, setItem(i, s) { if (i >= this.items.length) throw new RangeError(`oob ${i}`); this.items[i] = s; } };
  }
  test('stop() does not touch a row that no longer exists', () => {
    const list = strictList(['a', 'b', 'c', 'd', 'e']);
    const sp = createRowSpinner(list, { render() {} }, (i) => `ROW${i}`, { now: () => 0 });
    sp.start(4, false);          // spinner on the last row
    list.items = ['a', 'b'];     // list shrank (filter applied)
    assert.doesNotThrow(() => sp.stop(), 'stop must skip a now-missing row');
  });
  test('start() on an out-of-range index is a no-op, not a throw', () => {
    const list = strictList(['a', 'b']);
    const sp = createRowSpinner(list, { render() {} }, (i) => `ROW${i}`, { now: () => 0 });
    assert.doesNotThrow(() => sp.start(9, false));
  });
});

describe('padTaggedTo', () => {
  test('pads to the target VISIBLE width, ignoring color tags', () => {
    const out = padTaggedTo('{green-fg}hi{/green-fg}', 10);
    // visible "hi" = 2 chars → 8 trailing spaces; tags don't count.
    assert.equal(out, '{green-fg}hi{/green-fg}' + ' '.repeat(8));
  });
  test('never truncates when already wider than target', () => {
    assert.equal(padTaggedTo('{red-fg}abcdef{/red-fg}', 3), '{red-fg}abcdef{/red-fg}');
  });
  test('padding clears a shorter row (full-width overwrite)', () => {
    const visible = padTaggedTo(previewRowContent('⠹', false), 60).replace(/\{[^}]*\}/g, '');
    assert.equal(visible.length, 60, 'padded to full width so the old row tail is overwritten');
  });
});

describe('transportBadge', () => {
  test('green (locally) for local, red (remotely via SSH) for remote', () => {
    assert.equal(transportBadge(false), '{green-fg}(locally){/green-fg}');
    assert.equal(transportBadge(true), '{red-fg}(remotely via SSH){/red-fg}');
  });
});

describe('previewRowContent', () => {
  test('renders spinner + Previewing + badge + stop hint, no item name', () => {
    const c = previewRowContent('⠹', false);
    assert.match(c, /⠹ Previewing /);
    assert.ok(c.includes('(locally)'), 'has local badge');
    assert.ok(c.includes('(Space to stop)'), 'has stop hint');
    // The item name is intentionally omitted — the row IS the selected item.
    assert.ok(!/en_US|amy|\.mp3/.test(c), 'no track/voice name in the indicator');
  });

  test('remote variant shows the red SSH badge and a custom hint', () => {
    const c = previewRowContent('⠋', true, 'Space to stop preview');
    assert.ok(c.includes('(remotely via SSH)'));
    assert.ok(c.includes('(Space to stop preview)'));
  });
});

describe('createRowSpinner', () => {
  function fakeList() {
    return { items: {}, setItem(i, s) { this.items[i] = s; } };
  }
  const noRender = () => {};
  const screen = { render() {} };

  test('start() paints the previewing indicator on the given row', () => {
    const list = fakeList();
    const sp = createRowSpinner(list, screen, (i) => `ROW${i}`, { now: () => 0 });
    sp.start(3, false);
    assert.match(list.items[3], /Previewing/);
    assert.ok(list.items[3].includes('(locally)'));
    assert.equal(sp.isActive(), true);
    assert.equal(sp.activeIdx(), 3);
    sp.stop();
  });

  test('stop() restores the row via renderItem', () => {
    const list = fakeList();
    const sp = createRowSpinner(list, screen, (i) => `ROW${i}`, { now: () => 0 });
    sp.start(2, true);
    assert.ok(list.items[2].includes('(remotely via SSH)'));
    sp.stop();
    assert.equal(list.items[2], 'ROW2', 'row restored to normal content');
    assert.equal(sp.isActive(), false);
  });

  test('stopWithFloor keeps the row until the min window, then restores + runs after', async () => {
    const list = fakeList();
    let clock = 0;
    const sp = createRowSpinner(list, screen, (i) => `ROW${i}`, { now: () => clock, minVisibleMs: 50 });
    sp.start(1, true);
    let ran = false;
    sp.stopWithFloor(() => { ran = true; });
    await new Promise(r => setTimeout(r, 80));
    assert.equal(list.items[1], 'ROW1', 'restored after floor');
    assert.equal(ran, true, 'after() ran');
  });

  test('SPIN_FRAMES is a non-empty braille set', () => {
    assert.ok(Array.isArray(SPIN_FRAMES) && SPIN_FRAMES.length >= 8);
  });
});
