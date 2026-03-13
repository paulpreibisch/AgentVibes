/**
 * AgentVibes TUI — Shared Widget: Reverb Preset Picker
 *
 * Inline modal list for selecting reverb presets.
 * Extracted from settings-tab.js for reuse across tabs.
 */

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { destroyList } from './destroy-list.js';
import { BRAND_PINK } from '../brand-colors.js';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';
let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

const _modalTitle = (text) => ` {${BRAND_PINK}-fg}${text}{/${BRAND_PINK}-fg} `;

export const REVERB_PRESETS = Object.freeze([
  { label: 'Off (Dry, no reverb)',        value: 'off' },
  { label: 'Light (Small room)',           value: 'light' },
  { label: 'Medium (Conference room)',     value: 'medium' },
  { label: 'Heavy (Large hall)',           value: 'heavy' },
  { label: 'Cathedral (Epic space)',       value: 'cathedral' },
]);

/**
 * Open the reverb preset picker modal.
 *
 * @param {object}   screen        - blessed screen
 * @param {string}   currentPreset - current reverb preset value
 * @param {Function} onSelect      - called with selected preset value
 * @param {Function} [onClose]     - called after modal closes
 * @param {object}   [opts]        - options
 * @param {boolean}  [opts.applyToEffectsManager=true] - whether to apply via effects-manager.sh
 */
export function openReverbPicker(screen, currentPreset, onSelect, onClose, opts = {}) {
  const applyToEffectsManager = opts.applyToEffectsManager !== false;
  const currentIdx = Math.max(0, REVERB_PRESETS.findIndex(p => p.value === currentPreset));

  const COLORS = {
    btnFocus: '#00e5ff',
    btnFocusFg: '#000000',
  };

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 40,
    height: REVERB_PRESETS.length + 4,
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Select Reverb Preset'),
    items: REVERB_PRESETS.map((p, i) => (i === currentIdx ? `● ${p.label}` : `  ${p.label}`)),
    keys: true,
    vi: false,
    mouse: true,
    style: {
      border: { fg: COLORS.btnFocus },
      selected: { bg: COLORS.btnFocus, fg: COLORS.btnFocusFg, bold: true },
      item: { fg: '#e3f2fd' },
    },
  });

  list.select(currentIdx);
  list.focus();
  screen.render();

  list.key(['enter', 'space'], () => {
    const selected = REVERB_PRESETS[list.selected];
    if (!selected) return;
    destroyList(list, screen, onClose);

    if (applyToEffectsManager) {
      const effectsScript = path.join(process.cwd(), '.claude', 'hooks', 'effects-manager.sh');
      spawnSync('bash', [effectsScript, 'set-reverb', selected.value, 'default'], {
        stdio: 'ignore',
        timeout: 5000,
        env: { ...process.env },
      });
    }

    onSelect(selected.value);
  });

  list.key(['escape', 'q'], () => {
    destroyList(list, screen, onClose);
  });
}
