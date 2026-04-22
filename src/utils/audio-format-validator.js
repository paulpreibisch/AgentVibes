/**
 * Audio Format Validator - Magic Number Detection
 * Story 4.2: Audio Format Detection (Magic Number Validation)
 *
 * Validates audio file format by checking file headers (magic numbers).
 * Supported formats: MP3, WAV, OGG, M4A
 *
 * @module audio-format-validator
 * @requires fs
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Supported audio formats with their magic number signatures
 */
const AUDIO_FORMATS = {
  mp3: {
    extension: '.mp3',
    magicNumbers: [
      // MPEG-1/2/2.5 Audio Frame Header
      { bytes: Buffer.from([0xFF, 0xFB]), offset: 0, name: 'MP3 MPEG-2 Layer III' },
      { bytes: Buffer.from([0xFF, 0xFA]), offset: 0, name: 'MP3 MPEG-1 Layer III' },
      // ID3 Tag (v2.x and v2.4)
      { bytes: Buffer.from([0x49, 0x44, 0x33]), offset: 0, name: 'ID3v2 Tag' } // "ID3"
    ]
  },
  wav: {
    extension: '.wav',
    magicNumbers: [
      { bytes: Buffer.from('RIFF'), offset: 0, name: 'RIFF Header' },
      { bytes: Buffer.from('WAVE'), offset: 8, name: 'WAV Format' }
    ]
  },
  ogg: {
    extension: '.ogg',
    magicNumbers: [
      { bytes: Buffer.from('OggS'), offset: 0, name: 'OggS Header' }
    ]
  },
  m4a: {
    extension: '.m4a',
    magicNumbers: [
      { bytes: Buffer.from('ftypisom'), offset: 4, name: 'M4A ISO Base Media' },
      { bytes: Buffer.from('ftypM4A'), offset: 4, name: 'M4A Apple iTunes' }
    ]
  }
};

const SUPPORTED_EXTENSIONS = Object.values(AUDIO_FORMATS).map(f => f.extension);

/**
 * Story 4.2: Detect audio format by checking magic numbers in file header
 *
 * Reads the first 256 bytes of the file to check magic number signatures.
 * Does NOT require the file to have the correct extension matching format.
 *
 * @param {string} filePath - Path to audio file (must already be validated with isPathSafe)
 * @returns {Object} { isValid: boolean, error: string|null, format: string|null, detectedFormat: string|null }
 *
 * Object properties:
 * - isValid: true if file is valid audio format
 * - error: null on success, error message on failure
 * - format: detected format ('mp3', 'wav', 'ogg', 'm4a') or null
 * - detectedFormat: human-readable format name (e.g., "MP3 MPEG-1 Layer III")
 */
function detectAudioFormat(filePath) {
  try {
    if (!filePath || typeof filePath !== 'string') {
      return {
        isValid: false,
        error: 'File path must be a non-empty string',
        format: null,
        detectedFormat: null
      };
    }

    // Check file exists and is readable
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        error: 'File does not exist',
        format: null,
        detectedFormat: null
      };
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return {
        isValid: false,
        error: 'Path must be a regular file',
        format: null,
        detectedFormat: null
      };
    }

    // Check minimum file size (at least 12 bytes for WAV format check)
    if (stats.size < 12) {
      return {
        isValid: false,
        error: 'File is too small to be a valid audio file (minimum 12 bytes)',
        format: null,
        detectedFormat: null
      };
    }

    // Read first 256 bytes for magic number detection
    const buffer = Buffer.alloc(256);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 256, 0);
    } finally {
      fs.closeSync(fd);
    }

    // Check each format's magic numbers
    for (const [formatKey, formatInfo] of Object.entries(AUDIO_FORMATS)) {
      for (const magicInfo of formatInfo.magicNumbers) {
        // Check if magic bytes exist at the specified offset
        const isMatch = buffer.subarray(magicInfo.offset, magicInfo.offset + magicInfo.bytes.length)
          .equals(magicInfo.bytes);

        if (isMatch) {
          return {
            isValid: true,
            error: null,
            format: formatKey,
            detectedFormat: magicInfo.name
          };
        }
      }
    }

    // No magic numbers matched
    return {
      isValid: false,
      error: `Unsupported audio format. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      format: null,
      detectedFormat: null
    };

  } catch (err) {
    return {
      isValid: false,
      error: `Error detecting audio format: ${err.message}`,
      format: null,
      detectedFormat: null
    };
  }
}

/**
 * Story 4.2: Validate that file extension matches detected audio format
 *
 * Ensures the file extension is correct for the detected format.
 * This prevents accidental misnamed files (e.g., .txt file with MP3 content).
 *
 * @param {string} filePath - Path to audio file
 * @param {string} detectedFormat - Format from detectAudioFormat() result
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateFileExtension(filePath, detectedFormat) {
  try {
    if (!filePath || !detectedFormat) {
      return {
        isValid: false,
        error: 'File path and detected format are required'
      };
    }

    const ext = path.extname(filePath).toLowerCase();
    const expectedExt = AUDIO_FORMATS[detectedFormat]?.extension;

    if (!expectedExt) {
      return {
        isValid: false,
        error: `Unknown detected format: ${detectedFormat}`
      };
    }

    if (ext === expectedExt) {
      return {
        isValid: true,
        error: null
      };
    }

    // Extension doesn't match - return specific error
    return {
      isValid: false,
      error: `File extension (${ext || 'none'}) doesn't match actual format (.${detectedFormat})`
    };

  } catch (err) {
    return {
      isValid: false,
      error: `Error validating file extension: ${err.message}`
    };
  }
}

/**
 * Story 4.2: Comprehensive audio file validation
 *
 * Combines format detection and extension validation in one call.
 * Returns false only if BOTH format is unsupported AND extension is wrong.
 * Returns true if format is valid (even if extension differs).
 *
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Validation options
 * @param {boolean} options.strictExtension - If true, reject files with wrong extension (default: false)
 * @returns {Object} { isValid: boolean, error: string|null, format: string|null, detectedFormat: string|null, extensionMatch: boolean }
 */
function validateAudioFile(filePath, options = {}) {
  const { strictExtension = false } = options;

  try {
    // Detect format first
    const formatResult = detectAudioFormat(filePath);

    if (!formatResult.isValid) {
      return {
        isValid: false,
        error: formatResult.error,
        format: null,
        detectedFormat: null,
        extensionMatch: false
      };
    }

    // Check extension if strict mode enabled
    if (strictExtension) {
      const extResult = validateFileExtension(filePath, formatResult.format);
      if (!extResult.isValid) {
        return {
          isValid: false,
          error: extResult.error,
          format: formatResult.format,
          detectedFormat: formatResult.detectedFormat,
          extensionMatch: false
        };
      }
    }

    // Format is valid - check if extension matches (informational)
    const ext = path.extname(filePath).toLowerCase();
    const expectedExt = AUDIO_FORMATS[formatResult.format]?.extension;
    const extensionMatch = ext === expectedExt;

    return {
      isValid: true,
      error: null,
      format: formatResult.format,
      detectedFormat: formatResult.detectedFormat,
      extensionMatch
    };

  } catch (err) {
    return {
      isValid: false,
      error: `Unexpected validation error: ${err.message}`,
      format: null,
      detectedFormat: null,
      extensionMatch: false
    };
  }
}

export {
  detectAudioFormat,
  validateFileExtension,
  validateAudioFile,
  AUDIO_FORMATS,
  SUPPORTED_EXTENSIONS
};
