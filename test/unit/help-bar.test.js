import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHelpBar, selectorTitle } from '../../src/console/widgets/help-bar.js';

// One hint, rendered byte-for-byte with the exact color grammar:
//   brackets grey (#9e9e9e), key magenta, '=' grey, label white.
const ONE = '{#9e9e9e-fg}[{/#9e9e9e-fg}{magenta-fg}Space{/magenta-fg}'
  + '{#9e9e9e-fg}]{/#9e9e9e-fg} {#9e9e9e-fg}={/#9e9e9e-fg} {white-fg}preview{/white-fg}';

test('renderHelpBar formats a single hint with the exact tag grammar', () => {
  assert.equal(renderHelpBar([{ key: 'Space', label: 'preview' }]), ONE);
});

test('renderHelpBar joins multiple hints with two spaces by default', () => {
  const out = renderHelpBar([
    { key: 'Space', label: 'preview' },
    { key: 'Enter', label: 'select' },
  ]);
  assert.ok(out.includes('{magenta-fg}Space{/magenta-fg}'));
  assert.ok(out.includes('{magenta-fg}Enter{/magenta-fg}'));
  assert.ok(out.includes('{white-fg}preview{/white-fg}'));
  assert.ok(out.includes('{white-fg}select{/white-fg}'));
  // exactly one separator (two spaces) between the two hints
  assert.equal(out.split('{/white-fg}  {#9e9e9e-fg}').length, 2);
});

test('renderHelpBar honors a custom separator', () => {
  const out = renderHelpBar(
    [{ key: 'Enter', label: 'select' }, { key: 'Esc', label: 'cancel' }],
    { sep: '   ' },
  );
  assert.ok(out.includes('{/white-fg}   {#9e9e9e-fg}'));
});

test('renderHelpBar drops malformed/empty hints (never advertises a dead key)', () => {
  const out = renderHelpBar([
    { key: 'Enter', label: 'select' },
    { key: '', label: 'nope' },
    null,
    { key: 'Esc' },
  ]);
  assert.equal(out, renderHelpBar([{ key: 'Enter', label: 'select' }]));
});

test('renderHelpBar tolerates non-array input', () => {
  assert.equal(renderHelpBar(undefined), '');
  assert.equal(renderHelpBar(null), '');
});

test('selectorTitle builds the standardized bold cyan box label', () => {
  assert.equal(selectorTitle('Voice'), ' {bold}{cyan-fg}Voice Selector{/cyan-fg}{/bold} ');
  assert.equal(selectorTitle('Music Track'), ' {bold}{cyan-fg}Music Track Selector{/cyan-fg}{/bold} ');
  assert.equal(
    selectorTitle('Text To Speech (TTS) Engine'),
    ' {bold}{cyan-fg}Text To Speech (TTS) Engine Selector{/cyan-fg}{/bold} ',
  );
});
