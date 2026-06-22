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
  // ── No effect ────────────────────────────────────────────────────────
  { label: 'Off  (no effects)',               value: 'off'          },
  // ── Reverb ───────────────────────────────────────────────────────────
  { label: 'Light Reverb  (small room)',      value: 'light'        },
  { label: 'Medium Reverb  (conference)',     value: 'medium'       },
  { label: 'Heavy Reverb  (large hall)',      value: 'heavy'        },
  { label: 'Cathedral  (epic space)',         value: 'cathedral'    },
  // ── Chorus ───────────────────────────────────────────────────────────
  { label: 'Light Chorus',                   value: 'chorus-light' },
  { label: 'Deep Chorus',                    value: 'chorus-deep'  },
  // ── Echo ─────────────────────────────────────────────────────────────
  { label: 'Echo  (short delay)',             value: 'echo-short'   },
  { label: 'Cave Echo  (long)',               value: 'echo-long'    },
  // ── Character ────────────────────────────────────────────────────────
  { label: 'Warm  (reverb + bass)',           value: 'warm'         },
  { label: 'Radio  (EQ + overdrive)',         value: 'radio'        },
]);

// Alias for callers that haven't updated yet
export const AUDIO_EFFECT_PRESETS = REVERB_PRESETS;

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
    btnFocus: '#2e7d32',
    btnFocusFg: '#ffffff',
  };

  const list = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 48,
    height: Math.min(REVERB_PRESETS.length + 4, 18),
    border: { type: 'line' },
    tags: true,
    label: _modalTitle('Select Audio Effect'),
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

    if (applyToEffectsManager) {
      const _isWin = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
      if (!_isWin) {
        const effectsScript = path.join(process.cwd(), '.claude', 'hooks', 'effects-manager.sh');
        spawnSync('bash', [effectsScript, 'set-reverb', selected.value, 'default'], { // NOSONAR
          stdio: 'ignore',
          timeout: 5000,
          env: { ...process.env },
        });
      }
    }

    // Call onSelect before destroying to avoid stale-state re-renders
    onSelect(selected.value);
    destroyList(list, screen, onClose);
  });

  list.key(['escape', 'q', 'Q'], () => {
    destroyList(list, screen, onClose);
  });
}
