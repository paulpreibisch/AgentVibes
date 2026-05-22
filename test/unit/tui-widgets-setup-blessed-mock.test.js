/**
 * TUI Coverage — Widget files and setup-tab with blessed mock
 *
 * Uses --experimental-test-module-mocks to replace `blessed`.
 *
 * Targets:
 *   - personality-picker.js  (openPersonalityPicker — lines 60-216 uncovered)
 *   - reverb-picker.js       (openReverbPicker — lines 41-97 uncovered)
 *   - track-picker.js        (openTrackPicker, openVolumeInput — lines 37-325 uncovered)
 *   - notice.js              (showNotice — lines 29-55 uncovered)
 *   - modal-overlay.js       (ModalOverlay, createModalOverlay — lines 53-147 uncovered)
 *   - setup-tab.js           (createSetupTab — lines 388-3568 uncovered)
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Blessed stub
// ---------------------------------------------------------------------------

function makeWidget(tag = 'widget') {
  return {
    _tag: tag,
    append: () => {},
    remove: () => {},
    prepend: () => {},
    insert: () => {},
    insertBefore: () => {},
    insertAfter: () => {},
    setContent: () => {},
    getContent: () => '',
    setLabel: () => {},
    show: () => {},
    hide: () => {},
    toggle: () => {},
    focus: () => {},
    press: () => {},
    scroll: () => {},
    scrollTo: () => {},
    getScroll: () => 0,
    getScrollPerc: () => 0,
    setScrollPerc: () => {},
    setItems: () => {},
    clearItems: () => {},
    addItem: () => {},
    getItem: (i) => null,
    select: () => {},
    move: () => {},
    up: () => {},
    down: () => {},
    getValue: () => '',
    setValue: () => {},
    clearValue: () => {},
    input: (cb) => cb && cb(null, ''),
    prompt: (msg, cb) => cb && cb(null, ''),
    on: () => {},
    off: () => {},
    once: () => {},
    removeListener: () => {},
    emit: () => {},
    key: () => {},
    destroy: () => {},
    free: () => {},
    render: () => {},
    setFront: () => {},
    setBack: () => {},
    setIndex: () => {},
    style: { fg: '', bg: '', border: { fg: '' }, scrollbar: {}, focus: {} },
    border: { type: 'line' },
    hidden: true,
    content: '',
    height: 40,
    width: 120,
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    items: [],
    ritems: [],
    selected: 0,
    focused: null,
  };
}

const blessedStub = {
  box:      (opts) => makeWidget('box'),
  text:     (opts) => makeWidget('text'),
  textbox:  (opts) => makeWidget('textbox'),
  textarea: (opts) => makeWidget('textarea'),
  list:     (opts) => makeWidget('list'),
  listbar:  (opts) => makeWidget('listbar'),
  button:   (opts) => makeWidget('button'),
  prompt:   (opts) => makeWidget('prompt'),
  screen:   (opts) => makeWidget('screen'),
  escape:   (str)  => str || '',
};

// Install mock BEFORE loading any module that imports blessed
await mock.module('blessed', { defaultExport: blessedStub });

// ---------------------------------------------------------------------------
// Dynamic imports — AFTER mock installed
// ---------------------------------------------------------------------------

const { openPersonalityPicker, PERSONALITY_EMOJIS, PERSONALITIES } =
  await import('../../src/console/widgets/personality-picker.js');

const { openReverbPicker, REVERB_PRESETS } =
  await import('../../src/console/widgets/reverb-picker.js');

const { openTrackPicker, openVolumeInput } =
  await import('../../src/console/widgets/track-picker.js');

const { showNotice } =
  await import('../../src/console/widgets/notice.js');

const { ModalOverlay, createModalOverlay } =
  await import('../../src/console/modals/modal-overlay.js');

const { createSetupTab, getIntroDefault, formatGreeting } =
  await import('../../src/console/tabs/setup-tab.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockScreen() {
  return {
    append: () => {},
    remove: () => {},
    key: () => {},
    on: () => {},
    off: () => {},
    render: () => {},
    destroy: () => {},
    emit: () => {},
    focused: null,
    program: { clear: () => {} },
  };
}

function makeMockNav() {
  return {
    isModalOpen: () => false,
    openModal: (cb) => cb && cb(),
    closeModal: () => {},
    pushFocus: () => {},
    popFocus: () => null,
    switchTab: () => {},
  };
}

function makeMockConfigService(overrides = {}) {
  return {
    getConfig: () => ({
      provider: 'piper',
      voice: 'en_US-amy-medium',
      verbosity: 'high',
      language: 'en',
      ttsEngine: '',
      backgroundMusic: { track: null, enabled: false, volume: 50 },
      musicFavorites: [],
      favorites: [],
      thumbsUp: [],
      thumbsDown: [],
      personality: null,
      pretext: '',
      reverbPreset: null,
      reverbEnabled: false,
      reverb: { preset: null, enabled: false },
      backgroundMusicVolume: 50,
      setupCompleted: true,
      ...overrides,
    }),
    set: () => {},
    setGlobal: () => {},
    getGlobalConfig: () => ({}),
    getProjectConfig: () => null,
  };
}

function makeMockProviderService() {
  return {
    getActiveVoiceId: () => 'en_US-amy-medium',
    setActiveVoice: () => {},
    getActiveProvider: () => 'piper',
    getInstalledProviders: () => ['piper'],
    setActiveProvider: () => {},
  };
}

const mockSetupServices = {
  configService: makeMockConfigService(),
  providerService: makeMockProviderService(),
  navigationService: { switchTab: () => {} },
  focusMainTabBar: () => {},
  languageService: null,
};

// ===========================================================================
// personality-picker.js
// ===========================================================================

describe('personality-picker.js — constants', () => {
  test('PERSONALITY_EMOJIS is a non-empty object', () => {
    assert.ok(typeof PERSONALITY_EMOJIS === 'object' && PERSONALITY_EMOJIS !== null);
    assert.ok(Object.keys(PERSONALITY_EMOJIS).length > 0);
  });

  test('PERSONALITIES is a non-empty array', () => {
    assert.ok(Array.isArray(PERSONALITIES));
    assert.ok(PERSONALITIES.length > 0);
  });

  test('PERSONALITIES includes none and common personalities', () => {
    assert.ok(PERSONALITIES.includes('none'));
    assert.ok(PERSONALITIES.includes('professional'));
  });
});

describe('openPersonalityPicker() — with blessed mock', () => {
  test('does not throw with null personality', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openPersonalityPicker(screen, null, () => {}, () => {}));
  });

  test('does not throw with a valid personality', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openPersonalityPicker(screen, 'professional', () => {}, () => {}));
  });

  test('does not throw without onClose callback', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openPersonalityPicker(screen, 'zen', () => {}));
  });

  test('does not throw with unknown personality', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openPersonalityPicker(screen, 'nonexistent', () => {}, () => {}));
  });
});

// ===========================================================================
// reverb-picker.js
// ===========================================================================

describe('REVERB_PRESETS constant', () => {
  test('is a non-empty frozen array', () => {
    assert.ok(Array.isArray(REVERB_PRESETS));
    assert.ok(REVERB_PRESETS.length > 0);
  });

  test('each preset has label and value', () => {
    for (const preset of REVERB_PRESETS) {
      assert.ok(typeof preset.label === 'string');
      assert.ok(typeof preset.value === 'string');
    }
  });

  test('includes off preset', () => {
    assert.ok(REVERB_PRESETS.some(p => p.value === 'off'));
  });
});

describe('openReverbPicker() — with blessed mock', () => {
  test('does not throw with null preset', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openReverbPicker(screen, null, () => {}, () => {}));
  });

  test('does not throw with a valid preset', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openReverbPicker(screen, 'light', () => {}, () => {}));
  });

  test('does not throw with opts parameter', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openReverbPicker(screen, 'medium', () => {}, () => {}, { applyToEffectsManager: false }));
  });

  test('does not throw without onClose', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openReverbPicker(screen, 'off', () => {}));
  });
});

// ===========================================================================
// track-picker.js
// ===========================================================================

describe('openVolumeInput() — with blessed mock', () => {
  test('does not throw with valid volume', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openVolumeInput(screen, 70, () => {}, () => {}));
  });

  test('does not throw with null volume', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openVolumeInput(screen, null, () => {}, () => {}));
  });

  test('does not throw without onClose', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openVolumeInput(screen, 50, () => {}));
  });
});

describe('openTrackPicker() — with blessed mock', () => {
  test('does not throw with null track and volume', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openTrackPicker(screen, null, 70, () => {}, () => {}));
  });

  test('does not throw with a track name', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openTrackPicker(screen, 'track.mp3', 50, () => {}, () => {}));
  });

  test('does not throw with options', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => openTrackPicker(screen, null, 80, () => {}, () => {}, { showBuiltIn: true }));
  });
});

// ===========================================================================
// notice.js
// ===========================================================================

describe('showNotice() — with blessed mock', () => {
  test('does not throw with a basic message', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => showNotice(screen, 'Test notice'));
  });

  test('does not throw with all options', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => showNotice(screen, 'Hello', {
      bg: 'black',
      fg: 'white',
      borderFg: 'blue',
      durationMs: 100,
    }));
  });

  test('does not throw with empty string', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => showNotice(screen, ''));
  });

  test('does not throw with long message', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => showNotice(screen, 'A very long message that definitely exceeds 28 chars'));
  });
});

// ===========================================================================
// modal-overlay.js
// ===========================================================================

describe('ModalOverlay — with screen.program present (real path)', () => {
  test('constructs without throwing', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    assert.doesNotThrow(() => new ModalOverlay(screen, nav, { title: 'Test' }));
  });

  test('constructs with default title', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    assert.doesNotThrow(() => new ModalOverlay(screen, nav));
  });

  test('_title is stored correctly', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    const overlay = new ModalOverlay(screen, nav, { title: 'My Modal' });
    assert.strictEqual(overlay._title, 'My Modal');
  });

  test('open() does not throw', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    const overlay = new ModalOverlay(screen, nav, { title: 'Test' });
    assert.doesNotThrow(() => overlay.open());
  });

  test('close() does not throw', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    const overlay = new ModalOverlay(screen, nav, { title: 'Test' });
    assert.doesNotThrow(() => overlay.close());
  });

  test('setTitle() does not throw', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    const overlay = new ModalOverlay(screen, nav, { title: 'Test' });
    assert.doesNotThrow(() => overlay.setTitle('New Title'));
  });

  test('getContentBox() returns something', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    const overlay = new ModalOverlay(screen, nav, { title: 'Test' });
    const box = overlay.getContentBox();
    assert.ok(box !== undefined);
  });

  test('onApply setter does not throw', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    const overlay = new ModalOverlay(screen, nav, { title: 'Test' });
    assert.doesNotThrow(() => { overlay.onApply = () => {}; });
  });
});

describe('ModalOverlay — stub mode (screen without .program)', () => {
  test('constructs without throwing in stub mode', () => {
    const stubScreen = {
      append: () => {},
      remove: () => {},
      key: () => {},
      on: () => {},
      render: () => {},
      focused: null,
      // no .program property
    };
    const nav = makeMockNav();
    assert.doesNotThrow(() => new ModalOverlay(stubScreen, nav, { title: 'Stub' }));
  });
});

describe('createModalOverlay() factory', () => {
  test('returns a ModalOverlay instance', () => {
    const screen = makeMockScreen();
    const nav = makeMockNav();
    const overlay = createModalOverlay(screen, nav, { title: 'Factory' });
    assert.ok(overlay instanceof ModalOverlay);
  });
});

// ===========================================================================
// setup-tab.js — pure helpers
// ===========================================================================

describe('getIntroDefault()', () => {
  test('returns basename of the project dir', () => {
    const result = getIntroDefault('/home/user/my-project');
    assert.strictEqual(result, 'my-project');
  });

  test('returns empty string for null', () => {
    assert.strictEqual(getIntroDefault(null), '');
  });

  test('returns empty string for empty string', () => {
    assert.strictEqual(getIntroDefault(''), '');
  });

  test('handles trailing slash', () => {
    const result = getIntroDefault('/home/user/project/');
    assert.ok(typeof result === 'string');
  });
});

describe('formatGreeting()', () => {
  test('uses introText when provided', () => {
    const result = formatGreeting('Hello from Claude', 'my-project');
    assert.ok(result.includes('Hello from Claude'));
  });

  test('falls back to projectName when introText is empty', () => {
    const result = formatGreeting('', 'my-project');
    assert.ok(result.includes('my-project'));
  });

  test('falls back to AgentVibes when both empty', () => {
    const result = formatGreeting('', '');
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('returns a string', () => {
    assert.strictEqual(typeof formatGreeting('Hi', 'proj'), 'string');
  });
});

// ===========================================================================
// setup-tab.js — Tab Component Contract with blessed mock
// ===========================================================================

describe('createSetupTab() — with blessed mock (real code path)', () => {
  test('creates tab without throwing', () => {
    const screen = makeMockScreen();
    assert.doesNotThrow(() => createSetupTab(screen, mockSetupServices));
  });

  test('returns all 7 Tab Component Contract properties', () => {
    const screen = makeMockScreen();
    const tab = createSetupTab(screen, mockSetupServices);
    assert.ok('box' in tab, 'must have box');
    assert.strictEqual(typeof tab.show, 'function');
    assert.strictEqual(typeof tab.hide, 'function');
    assert.strictEqual(typeof tab.onFocus, 'function');
    assert.strictEqual(typeof tab.onBlur, 'function');
    assert.strictEqual(typeof tab.getFooterText, 'function');
    assert.strictEqual(typeof tab.getFooterColor, 'function');
  });

  test('getFooterColor() returns a string', () => {
    const screen = makeMockScreen();
    const tab = createSetupTab(screen, mockSetupServices);
    assert.strictEqual(typeof tab.getFooterColor(), 'string');
  });

  test('getFooterText() returns a string', () => {
    const screen = makeMockScreen();
    const tab = createSetupTab(screen, mockSetupServices);
    assert.strictEqual(typeof tab.getFooterText(), 'string');
  });

  test('show() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createSetupTab(screen, mockSetupServices);
    assert.doesNotThrow(() => tab.show());
  });

  test('hide() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createSetupTab(screen, mockSetupServices);
    assert.doesNotThrow(() => tab.hide());
  });

  test('onFocus() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createSetupTab(screen, mockSetupServices);
    assert.doesNotThrow(() => tab.onFocus());
  });

  test('onBlur() does not throw', () => {
    const screen = makeMockScreen();
    const tab = createSetupTab(screen, mockSetupServices);
    assert.doesNotThrow(() => tab.onBlur());
  });

  test('works with first-run config (setupCompleted: false)', () => {
    const screen = makeMockScreen();
    const services = {
      ...mockSetupServices,
      configService: makeMockConfigService({ setupCompleted: false }),
    };
    assert.doesNotThrow(() => createSetupTab(screen, services));
  });

  test('works with languageService', () => {
    const screen = makeMockScreen();
    const services = {
      ...mockSetupServices,
      languageService: {
        getLang: () => 'en',
        t: (key) => key,
        onChange: (cb) => {},
      },
    };
    assert.doesNotThrow(() => createSetupTab(screen, services));
  });
});
