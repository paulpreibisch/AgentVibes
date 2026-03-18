/**
 * Installer Termux Detection Tests
 * Tests Termux environment detection functions
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'fs';

// Import functions to test
import { isTermux, detectAndNotifyTermux } from '../../src/installer.js';

test('isTermux function exists and returns boolean', () => {
  const result = isTermux();
  assert.strictEqual(typeof result, 'boolean', 'isTermux should return a boolean value');
});

test('isTermux returns false on non-Termux systems', () => {
  // This test will pass on standard Linux/Mac systems where Termux directory doesn't exist
  // On actual Termux, this would return true
  const termuxPath = '/data/data/com.termux';
  const expected = existsSync(termuxPath);
  const result = isTermux();
  assert.strictEqual(result, expected, 'isTermux should match actual filesystem state');
});

test('detectAndNotifyTermux function exists and returns boolean', () => {
  const result = detectAndNotifyTermux();
  assert.strictEqual(typeof result, 'boolean', 'detectAndNotifyTermux should return a boolean value');
});

test('detectAndNotifyTermux returns same value as isTermux', () => {
  // Capture console output
  const originalLog = console.log;
  const logs = [];
  console.log = (...args) => logs.push(args);

  const isTermuxResult = isTermux();
  const detectResult = detectAndNotifyTermux();

  // Restore console
  console.log = originalLog;

  assert.strictEqual(
    detectResult,
    isTermuxResult,
    'detectAndNotifyTermux should return same boolean as isTermux'
  );

  // If on Termux, should log messages
  if (isTermuxResult) {
    assert.ok(logs.length >= 2, 'Should log Android detection messages when on Termux');
  } else {
    assert.strictEqual(logs.length, 0, 'Should not log anything when not on Termux');
  }
});

test('isTermux checks the correct path', () => {
  // This test verifies the function checks the expected Termux path
  const termuxPath = '/data/data/com.termux';
  const pathExists = existsSync(termuxPath);
  const functionResult = isTermux();

  assert.strictEqual(
    functionResult,
    pathExists,
    'isTermux result should match existence of /data/data/com.termux directory'
  );
});
