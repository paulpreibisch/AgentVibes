/**
 * AgentVibes — Shared preview transport badge + row spinner.
 *
 * Every music & voice preview surface renders an identical "previewing" cue ON
 * THE SELECTED ROW (not a separate bottom line), so the user always sees where a
 * preview is going and can stop it:
 *
 *   ⠹ Previewing (locally)            (Space to stop)   — green, plays here
 *   ⠹ Previewing (remotely via SSH)   (Space to stop)   — red, forwarded to receiver
 *
 * The item name is intentionally omitted — the animated row IS the selected item.
 * Kept in one neutral module so music and voice pickers can't drift.
 */

/** Braille spinner frames, shared by every preview surface. */
export const SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Color-coded transport badge shown right after "Previewing".
 * @param {boolean} remote - true when forwarded to the SSH receiver
 * @returns {string} blessed-tagged badge, e.g. "{red-fg}(remotely via SSH){/red-fg}"
 */
export function transportBadge(remote) {
  return remote
    ? '{red-fg}(remotely via SSH){/red-fg}'
    : '{green-fg}(locally){/green-fg}';
}

/**
 * Right-pad a blessed-tagged string with spaces to a target VISIBLE width, so a
 * shorter row fully overwrites a longer previous row (blessed's list.setItem does
 * not clear leftover cells → the old tail ghosts through). Color tags don't count
 * toward width. Over-padding is safe: a non-wrapping list clips the overflow.
 * @param {string} tagged
 * @param {number} width - target visible width (e.g. the list's outer width)
 * @returns {string}
 */
export function padTaggedTo(tagged, width) {
  if (!width || width <= 0) return tagged;
  const visible = tagged.replace(/\{[^}]*\}/g, '');
  const pad = width - visible.length;
  return pad > 0 ? tagged + ' '.repeat(pad) : tagged;
}

/**
 * The full "previewing" row content (spinner frame + Previewing + badge + hint).
 * @param {string} frameChar - one SPIN_FRAMES glyph
 * @param {boolean} remote
 * @param {string} [stopHint]
 * @returns {string} blessed-tagged row content
 */
export function previewRowContent(frameChar, remote, stopHint = 'Space to stop') {
  return `{cyan-fg}${frameChar} Previewing {/cyan-fg}${transportBadge(remote)}{cyan-fg}  (${stopHint}){/cyan-fg}`;
}

/**
 * Attach an animated preview indicator to the SELECTED row of a blessed list.
 * Generalizes the Kokoro picker's row spinner so every picker behaves identically.
 *
 * @param {object}   list        - blessed list (needs setItem(idx, str))
 * @param {object}   screen      - blessed screen (needs render())
 * @param {(idx:number)=>string} renderItem - returns a row's normal content (to restore on stop)
 * @param {object}   [opts]
 * @param {()=>boolean} [opts.isClosed] - guard: true once the picker is torn down
 * @param {()=>number}  [opts.now]      - clock (ms); injectable for tests
 * @param {number}   [opts.intervalMs]  - frame interval (default 80)
 * @param {number}   [opts.minVisibleMs]- min on-screen window for fire-and-forget remote (default 1100)
 * @returns {{ start:Function, stop:Function, stopWithFloor:Function, isActive:Function, activeIdx:Function }}
 */
export function createRowSpinner(list, screen, renderItem, opts = {}) {
  const isClosed = opts.isClosed ?? (() => false);
  const now = opts.now ?? (() => Date.now());
  const intervalMs = opts.intervalMs ?? 80;
  const minVisibleMs = opts.minVisibleMs ?? 1100;
  // isStatic: write the indicator ONCE (no animation). Used for lists with
  // double-width emoji (the Music tab): repeated in-place mutation of emoji rows
  // desyncs blessed's terminal output. One write + full-width space padding is
  // the least-fragile option there. A frozen "♪" stands in for the spinner.
  const isStatic = opts.static ?? false;

  let timer = null;
  let floor = null;
  let frame = 0;
  let idx = -1;
  let remote = false;
  let startTs = 0;

  // Guard: blessed's List.setItem dereferences this.items[i] unchecked, so a
  // stale idx (e.g. the list was rebuilt shorter by a filter while a preview was
  // active) would throw an uncaught TypeError and kill the whole TUI. Only touch
  // a row that still exists. list.items is an array on a real list; the test stub
  // uses a plain object, so treat "not an array" as always-in-range.
  function _inRange(i) {
    if (i < 0) return false;
    return Array.isArray(list.items) ? i < list.items.length : true;
  }

  function _paint() {
    if (!_inRange(idx)) return;
    // Pad to the widest reliable measure so the row fully overwrites the previous
    // (longer) content. list.width may still be a percentage string pre-layout, so
    // fall back to the screen width; over-padding is clipped by the non-wrapping list.
    const lw = (typeof list.width === 'number' && list.width > 0) ? list.width : 0;
    const sw = (screen && typeof screen.width === 'number' && screen.width > 0) ? screen.width : 0;
    const w = Math.max(lw, sw, 80);
    const spin = isStatic ? '♪' : SPIN_FRAMES[frame++ % SPIN_FRAMES.length];
    list.setItem(idx, padTaggedTo(previewRowContent(spin, remote), w));
    screen.render();
  }

  function stop() {
    if (floor) { clearTimeout(floor); floor = null; }
    if (timer) { clearInterval(timer); timer = null; }
    if (_inRange(idx) && !isClosed()) {
      list.setItem(idx, renderItem(idx));
      screen.render();
    }
    idx = -1;
  }

  return {
    start(rowIdx, isRemote) {
      stop();
      idx = rowIdx;
      frame = 0;
      remote = !!isRemote;
      startTs = now();
      _paint();
      if (isStatic) return; // static indicator: written once, no animation loop
      timer = setInterval(() => { if (isClosed()) { stop(); return; } _paint(); }, intervalMs);
      // A UI spinner must never keep the process alive (blessed's stdin does that
      // in the real TUI); unref so a leaked spinner can't hang node --test on exit.
      if (timer.unref) timer.unref();
    },
    // Fire-and-forget remote sends exit in ms; keep the row visible ≥ minVisibleMs
    // so the user still sees a "preview sent" cue, then restore and run `after`.
    stopWithFloor(after) {
      if (floor) { clearTimeout(floor); floor = null; }
      const wait = Math.max(0, minVisibleMs - (now() - startTs));
      floor = setTimeout(() => { floor = null; stop(); if (!isClosed() && after) after(); }, wait);
      if (floor.unref) floor.unref();
    },
    stop,
    isActive: () => idx >= 0,
    activeIdx: () => idx,
  };
}
