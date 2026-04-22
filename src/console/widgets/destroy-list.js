/**
 * AgentVibes TUI — Shared Widget: Modal Destroy Helper
 *
 * Force-invalidates blessed's olines buffer after destroying a modal widget.
 * Without this, blessed skips repainting cells where lines==olines and the
 * terminal retains stale modal content as ghost artifacts.
 */

/**
 * Destroy a blessed list/box widget and force full screen repaint.
 *
 * @param {object} widget  - blessed widget to destroy
 * @param {object} screen  - blessed screen instance
 * @param {Function} [onClose] - optional callback after destruction
 */
export function destroyList(widget, screen, onClose) {
  widget.destroy();
  try {
    for (let r = 0; r < screen.height; r++)
      for (let c = 0; c < screen.width; c++)
        if (screen.olines[r]?.[c]) screen.olines[r][c][0] = -1;
  } catch {}
  onClose?.();
  screen.render();
}
