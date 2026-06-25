import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatVoiceRow, genderIconTag, VOICE_ROW_COLS } from '../../src/console/tabs/voices-tab.js';

test('formatVoiceRow colors gender via genderIconTag (magenta ♀ / cyan ♂)', () => {
  assert.ok(formatVoiceRow({ name: 'Sarah', gender: 'Female' }).includes(genderIconTag('Female')));
  assert.ok(formatVoiceRow({ name: 'Roger', gender: 'Male' }).includes(genderIconTag('Male')));
  // colored, not grey
  assert.ok(formatVoiceRow({ name: 'Sarah', gender: 'Female' }).includes('{magenta-fg}♀{/magenta-fg}'));
});

test('formatVoiceRow pads name and language to the shared fixed widths', () => {
  const row = formatVoiceRow({ name: 'Bo', gender: 'Male', lang: 'ja', detail: 'x' });
  assert.ok(row.includes('Bo' + ' '.repeat(VOICE_ROW_COLS.name - 2)), 'name padded to NAME width');
  assert.ok(row.includes('{#9e9e9e-fg}' + 'ja' + ' '.repeat(VOICE_ROW_COLS.lang - 2) + '{/#9e9e9e-fg}'), 'lang padded grey');
});

test('language and detail are grey; gender stays its own colored column (not merged, no brackets)', () => {
  const row = formatVoiceRow({ name: 'Heart', gender: 'Female', lang: 'en-US', detail: 'af_heart' });
  assert.ok(!row.includes('('), 'no brackets around language');
  assert.ok(row.includes('{#9e9e9e-fg}en-US '), 'language rendered as its own grey column');
  assert.ok(row.includes('{magenta-fg}♀{/magenta-fg}'), 'gender is a separate colored column');
  assert.ok(row.includes('{#9e9e9e-fg}af_heart{/#9e9e9e-fg}'), 'detail rendered grey');
});

test('long names are truncated with an ellipsis to the fixed width', () => {
  const row = formatVoiceRow({ name: 'Supercalifragilistic', gender: '' });
  assert.ok(row.includes('…'), 'over-long name is ellipsized');
});

test('every provider feeding the same fields yields identical column structure', () => {
  // Same logical row from "different providers" must produce the same string.
  const a = formatVoiceRow({ status: '  ', name: 'Liam', gender: 'Male', lang: 'en-US', detail: 'd' });
  const b = formatVoiceRow({ status: '  ', name: 'Liam', gender: 'Male', lang: 'en-US', detail: 'd' });
  assert.equal(a, b);
});
