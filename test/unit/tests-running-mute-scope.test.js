/**
 * Scoped "tests running" mute — JS twin (setup-tab.js testsRunningMute) of
 * .claude/hooks/tests-running-guard.sh. Same cases as tests-running-guard.bats.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.AGENTVIBES_TEST_MODE = 'true';
const { testsRunningMute } = await import('../../src/console/tabs/setup-tab.js');

function withMarker(contents, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-mute-'));
  const marker = path.join(dir, '.agentvibes-tests-running');
  try {
    if (contents !== null) fs.writeFileSync(marker, contents);
    fn(marker);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('no marker -> not muted', () => {
  withMarker(null, (m) => assert.equal(testsRunningMute(['/c/x'], m), false));
});

test('empty marker -> muted everywhere (legacy)', () => {
  withMarker('', (m) => assert.equal(testsRunningMute(['/anything'], m), true));
});

test('inside the root under test -> muted; other project and prefix sibling -> not', () => {
  withMarker('/c/Users/me/AgentVibes\n', (m) => {
    assert.equal(testsRunningMute(['/c/Users/me/AgentVibes/test'], m), true);
    assert.equal(testsRunningMute(['/c/Users/me/preibisch.biz'], m), false);
    assert.equal(testsRunningMute(['/c/Users/me/AgentVibes-kokoro-warm'], m), false);
  });
});

test('Windows path forms, case and CRLF match the Git Bash root', () => {
  withMarker('/c/Users/me/AgentVibes\r\n', (m) => {
    assert.equal(testsRunningMute(['C:\\Users\\Me\\agentvibes\\'], m), true);
    assert.equal(testsRunningMute([undefined, 'C:/Users/me/AgentVibes/src'], m), true);
  });
});
