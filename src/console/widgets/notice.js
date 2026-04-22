/**
 * AgentVibes TUI — Shared Widget: Notice Toast
 *
 * Displays a short auto-dismissing notice modal centred on screen.
 * Usable from any tab; no settings-specific state required.
 */

import { destroyList } from './destroy-list.js';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';
let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

/**
 * Show a temporary notice that auto-dismisses after 2.5 seconds.
 *
 * @param {object} screen  - blessed screen instance
 * @param {string} message - text to display
 * @param {object} [opts]
 * @param {string} [opts.bg='#0a0e1a']       - background colour
 * @param {string} [opts.fg='#e3f2fd']       - foreground colour
 * @param {string} [opts.borderFg='bright-cyan'] - border colour
 * @param {number} [opts.durationMs=2500]    - auto-dismiss delay in ms
 */
export function showNotice(screen, message, opts = {}) {
  const bg         = opts.bg         ?? '#0a0e1a';
  const fg         = opts.fg         ?? '#e3f2fd';
  const borderFg   = opts.borderFg   ?? 'bright-cyan';
  const durationMs = opts.durationMs ?? 2500;

  const width = Math.max(28, message.length + 6);
  const modal = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width,
    height: 3,
    border: { type: 'line' },
    tags: true,
    content: `{center}${message}{/center}`,
    style: {
      fg,
      bg,
      border: { fg: borderFg },
    },
  });
  screen.render();

  setTimeout(() => {
    destroyList(modal, screen);
  }, durationMs);
}
