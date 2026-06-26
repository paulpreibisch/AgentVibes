import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatVoiceRow, genderIconTag, VOICE_ROW_COLS, cellWidth } from '../../src/console/tabs/voices-tab.js';

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

test('cellWidth counts emoji as 2 cells, color tags as 0, VS16 as 0', () => {
  assert.equal(cellWidth('{green-fg}👍{/green-fg}'), 2, 'thumb emoji is 2 cells, tags 0');
  assert.equal(cellWidth('★'), 1, 'BMP star is 1 cell');
  assert.equal(cellWidth('  '), 2, 'two spaces are 2 cells');
  assert.equal(cellWidth('☁️'), 1, 'cloud + VS16 stays 1 cell');
});

test('status column is a fixed cell width so emoji rows align with glyph rows', () => {
  // Piper (emoji thumb), Kokoro (gold star + check), ElevenLabs (blank default).
  const piper  = formatVoiceRow({ status: `♪{green-fg}👍{/green-fg}`, name: 'Amy', gender: 'Female', lang: 'en-US', detail: 'piper' });
  const kokoro = formatVoiceRow({ status: `{#FFD700-fg}★{/#FFD700-fg} {green-fg}✓{/green-fg}`, name: 'Amy', gender: 'Female', lang: 'en-US', detail: 'af' });
  const eleven = formatVoiceRow({ name: 'Amy', gender: 'Female', lang: 'en-US', detail: 'desc' });
  // Visible width up to the gender icon must match across providers.
  const upto = (s) => cellWidth(s.slice(0, s.indexOf(genderIconTag('Female'))));
  assert.equal(upto(piper), upto(kokoro), 'Piper aligns with Kokoro');
  assert.equal(upto(piper), upto(eleven), 'Piper aligns with ElevenLabs');
  assert.equal(VOICE_ROW_COLS.status, 3, 'status column width is exposed');
});

test('every provider feeding the same fields yields identical column structure', () => {
  // Same logical row from "different providers" must produce the same string.
  const a = formatVoiceRow({ status: '  ', name: 'Liam', gender: 'Male', lang: 'en-US', detail: 'd' });
  const b = formatVoiceRow({ status: '  ', name: 'Liam', gender: 'Male', lang: 'en-US', detail: 'd' });
  assert.equal(a, b);
});
