/**
 * Edge Cases and Special Characters Security Testing
 * Story 4.8: Comprehensive Security Testing
 *
 * Tests security validators against edge cases and special character attacks.
 * TOTAL: 65+ edge case variations
 *
 * @module security/edge-cases.test
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { isPathSafe } from '../../src/utils/music-file-validator.js';

describe('Edge Cases and Special Characters Security Testing (Story 4.8)', () => {
  let testDir;
  let homeDir;
  let validFile;

  before(() => {
    homeDir = os.homedir();
    testDir = path.join(homeDir, '.agentvibes-edge-test');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    validFile = path.join(testDir, 'valid.mp3');
    fs.writeFileSync(validFile, 'test audio data');
  });

  after(() => {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Warning: Failed to clean up test directory: ${err.message}`);
    }
  });

  describe('Trailing and Multiple Slashes', () => {
    const patterns = [
      '../../../etc/passwd/',
      '..//../..//etc///passwd',
      '../\\../\\etc/',
      '///etc/passwd',
      '\\\\\\Windows\\System32',
    ];

    patterns.forEach((attackPath, i) => {
      test(`should reject slash variation ${i + 1}`, () => {
        const result = isPathSafe(attackPath, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });
  });

  describe('Special Characters', () => {
    const patterns = [
      '../../../etc/passwd;ls',
      '../../../etc/passwd|cat',
      '../../../etc/passwd&whoami',
      '../../../etc/pass*',
      '../../../etc/passwd?query=1',
    ];

    patterns.forEach((attackPath, i) => {
      test(`should reject special char ${i + 1}`, () => {
        const result = isPathSafe(attackPath, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });
  });

  describe('Unicode Normalization Attacks', () => {
    test('should reject NFC vs NFD differences', () => {
      const nfcPath = '../\u00e9/../etc/passwd';
      const nfdPath = '../e\u0301/../etc/passwd';

      assert.strictEqual(isPathSafe(nfcPath, homeDir).isValid, false);
      assert.strictEqual(isPathSafe(nfdPath, homeDir).isValid, false);
    });

    test('should reject fullwidth characters', () => {
      const paths = [
        '../\uff0e\uff0e/etc/passwd',
        '../\ufe52\ufe52/etc',
      ];

      paths.forEach(attackPath => {
        assert.strictEqual(isPathSafe(attackPath, homeDir).isValid, false);
      });
    });

    test('should reject zero-width characters', () => {
      const paths = [
        '..\u200B/..\u200B/etc',
        '..\u200C/..\u200C/etc',
        '..\uFEFF/..\uFEFF/etc',
      ];

      paths.forEach(attackPath => {
        assert.strictEqual(isPathSafe(attackPath, homeDir).isValid, false);
      });
    });

    test('should reject BiDi/RTLO attacks', () => {
      const paths = [
        '../\u202E/etc/passwd',
        'valid.mp3\u202Etxt.ect',
      ];

      paths.forEach(attackPath => {
        assert.strictEqual(isPathSafe(attackPath, homeDir).isValid, false);
      });
    });

    test('should reject overlong UTF-8 sequences', () => {
      const overlongSlash = String.fromCharCode(0xc0, 0xaf);
      const attackPath = '..' + overlongSlash + '..' + overlongSlash + 'etc';

      assert.strictEqual(isPathSafe(attackPath, homeDir).isValid, false);
    });
  });

  describe('Whitespace and Control Characters', () => {
    const patterns = [
      '.. / .. / etc / passwd',
      '..\t..\tetc\tpasswd',
      '../\n../\netc',
      '..\r..\retc',
      '../\r\n../\r\netc',
      '..\u00A0..\u00A0etc',
    ];

    patterns.forEach((attackPath, i) => {
      test(`should reject whitespace ${i + 1}`, () => {
        const result = isPathSafe(attackPath, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });
  });

  describe('CRLF Injection', () => {
    const patterns = [
      'valid.mp3\r\n../../etc/passwd',
      '../etc/passwd\r\nmalicious',
      'valid.mp3\n../../etc/passwd',
      'valid.mp3\0\n../../etc',
    ];

    patterns.forEach((attackPath, i) => {
      test(`should reject CRLF ${i + 1}`, () => {
        const result = isPathSafe(attackPath, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });
  });

  describe('Long Path Attacks', () => {
    test('should handle extremely long paths', () => {
      const longPath = '../'.repeat(1000) + 'etc/passwd';
      const result = isPathSafe(longPath, homeDir);
      assert.strictEqual(result.isValid, false);
    });

    test('should handle paths exceeding MAX_PATH', () => {
      const longSegment = 'a'.repeat(300);
      const longPath = `../${longSegment}/etc/passwd`;
      const result = isPathSafe(longPath, homeDir);
      assert.strictEqual(result.isValid, false);
    });
  });

  describe('Empty and Boundary Cases', () => {
    test('should reject empty string', () => {
      const result = isPathSafe('', homeDir);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error.includes('non-empty string'));
    });

    test('should reject whitespace-only paths', () => {
      const paths = [' ', '  ', '\t', '\n', '\r\n'];

      paths.forEach(attackPath => {
        const result = isPathSafe(attackPath, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });

    test('should reject just slashes', () => {
      const paths = ['/', '//', '///'];

      paths.forEach(attackPath => {
        const result = isPathSafe(attackPath, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });
  });

  describe('Platform-Specific Attacks', () => {
    test('should reject Windows device names', () => {
      const deviceNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];

      deviceNames.forEach(device => {
        const result = isPathSafe(device, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });

    test('should reject Windows reserved characters', () => {
      const paths = [
        '../etc<passwd',
        '../etc>passwd',
        '../etc:passwd',
        '../etc|passwd',
      ];

      paths.forEach(attackPath => {
        const result = isPathSafe(attackPath, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });

    test('should reject UNC path variations', () => {
      const uncPaths = [
        '\\\\localhost\\c$',
        '\\\\127.0.0.1\\admin$',
        '\\\\?\\C:\\Windows',
      ];

      uncPaths.forEach(attackPath => {
        const result = isPathSafe(attackPath, homeDir);
        assert.strictEqual(result.isValid, false);
      });
    });
  });

  describe('Edge Case Security Requirements', () => {
    test('should not crash on malformed input', () => {
      const malformedInputs = [
        '\uD800',           // Unpaired high surrogate
        '\uDFFF',           // Unpaired low surrogate
        String.fromCharCode(0xFFFF),
        String.fromCharCode(0),
      ];

      malformedInputs.forEach(input => {
        assert.doesNotThrow(() => {
          isPathSafe(input, homeDir);
        });
      });
    });

    test('should handle extreme attacks gracefully', () => {
      const extremeAttacks = [
        '../'.repeat(10000),
        '\0'.repeat(100),
        'A'.repeat(100000),
      ];

      extremeAttacks.forEach(attack => {
        assert.doesNotThrow(() => {
          const result = isPathSafe(attack, homeDir);
          assert.strictEqual(result.isValid, false);
        });
      });
    });
  });
});
