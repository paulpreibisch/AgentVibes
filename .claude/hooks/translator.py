#!/usr/bin/env python3
#
# File: .claude/hooks/translator.py
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
# express or implied. Use at your own risk. See the Apache License for details.
#
# ---
#
# @fileoverview Text translator for multi-language TTS and learning mode
# @context Provides automatic translation using Google Translate via deep-translator library
# @architecture Standalone CLI module callable from bash scripts, with library mode for Python imports
# @dependencies deep-translator, langdetect (pip install deep-translator langdetect)
# @entrypoints CLI: python3 translator.py <text> <target_lang>, Library: from translator import translate
# @patterns Command pattern - supports translate, detect, and batch operations
# @related play-tts.sh, learn-manager.sh, language-manager.sh
#

"""
Text translation utilities for AgentVibes multi-language TTS.

Provides automatic translation of TTS text to the user's preferred language,
supporting both BMAD communication_language settings and learning mode.

Usage:
    CLI: python3 translator.py <text> <target_language>
    Library: from translator import translate, detect_language
"""

import sys
import os
from typing import Optional, Tuple

# Language name to ISO code mapping
LANG_CODES = {
    'spanish': 'es', 'español': 'es', 'es': 'es',
    'french': 'fr', 'français': 'fr', 'fr': 'fr',
    'german': 'de', 'deutsch': 'de', 'de': 'de',
    'italian': 'it', 'italiano': 'it', 'it': 'it',
    'portuguese': 'pt', 'português': 'pt', 'pt': 'pt',
    'chinese': 'zh-CN', 'mandarin': 'zh-CN', 'zh': 'zh-CN', '中文': 'zh-CN',
    'japanese': 'ja', '日本語': 'ja', 'ja': 'ja',
    'korean': 'ko', '한국어': 'ko', 'ko': 'ko',
    'russian': 'ru', 'русский': 'ru', 'ru': 'ru',
    'polish': 'pl', 'polski': 'pl', 'pl': 'pl',
    'dutch': 'nl', 'nederlands': 'nl', 'nl': 'nl',
    'turkish': 'tr', 'türkçe': 'tr', 'tr': 'tr',
    'arabic': 'ar', 'العربية': 'ar', 'ar': 'ar',
    'hindi': 'hi', 'हिन्दी': 'hi', 'hi': 'hi',
    'swedish': 'sv', 'svenska': 'sv', 'sv': 'sv',
    'danish': 'da', 'dansk': 'da', 'da': 'da',
    'norwegian': 'no', 'norsk': 'no', 'no': 'no',
    'finnish': 'fi', 'suomi': 'fi', 'fi': 'fi',
    'czech': 'cs', 'čeština': 'cs', 'cs': 'cs',
    'romanian': 'ro', 'română': 'ro', 'ro': 'ro',
    'ukrainian': 'uk', 'українська': 'uk', 'uk': 'uk',
    'greek': 'el', 'ελληνικά': 'el', 'el': 'el',
    'bulgarian': 'bg', 'български': 'bg', 'bg': 'bg',
    'croatian': 'hr', 'hrvatski': 'hr', 'hr': 'hr',
    'slovak': 'sk', 'slovenčina': 'sk', 'sk': 'sk',
    'english': 'en', 'en': 'en',
}


def get_lang_code(language: str) -> str:
    """
    Convert language name to ISO code.

    Args:
        language: Language name or code (e.g., 'spanish', 'es', 'español')

    Returns:
        ISO language code (e.g., 'es')
    """
    lang_lower = language.lower().strip()
    return LANG_CODES.get(lang_lower, lang_lower)


def detect_language(text: str) -> Optional[str]:
    """
    Detect the language of given text.

    Args:
        text: Text to analyze

    Returns:
        Language code (e.g., 'es', 'fr', 'en') or None if detection fails
    """
    if not text or len(text.strip()) < 3:
        return None

    try:
        from langdetect import detect, LangDetectException
        return detect(text)
    except ImportError:
        print("Warning: langdetect not installed. Run: pip install langdetect", file=sys.stderr)
        return None
    except Exception:
        return None


def translate(text: str, target_lang: str, source_lang: str = 'en') -> Tuple[str, bool]:
    """
    Translate text to target language.

    Args:
        text: Text to translate
        target_lang: Target language (name or code)
        source_lang: Source language (default: 'en')

    Returns:
        Tuple of (translated_text, success)
    """
    if not text or not text.strip():
        return text, False

    # Convert language names to codes
    target_code = get_lang_code(target_lang)
    source_code = get_lang_code(source_lang)

    # Skip if source and target are the same
    if target_code == source_code:
        return text, False

    # Skip if target is English and source is also English
    if target_code == 'en' and source_code == 'en':
        return text, False

    try:
        from deep_translator import GoogleTranslator

        translator = GoogleTranslator(source=source_code, target=target_code)
        translated = translator.translate(text)

        if translated:
            return translated, True
        return text, False

    except ImportError:
        print("Error: deep-translator not installed. Run: pip install deep-translator", file=sys.stderr)
        return text, False
    except Exception as e:
        print(f"Translation error: {e}", file=sys.stderr)
        return text, False


def translate_auto(text: str, target_lang: str) -> Tuple[str, bool, Optional[str]]:
    """
    Translate text to target language with auto-detection of source language.

    Args:
        text: Text to translate
        target_lang: Target language (name or code)

    Returns:
        Tuple of (translated_text, success, detected_source_lang)
    """
    if not text or not text.strip():
        return text, False, None

    # Detect source language
    detected = detect_language(text)

    # Convert target to code
    target_code = get_lang_code(target_lang)

    # Skip if detected language matches target
    if detected and detected == target_code:
        return text, False, detected

    # Translate
    translated, success = translate(text, target_lang, source_lang=detected or 'en')
    return translated, success, detected


def main():
    """CLI entry point for translator."""
    if len(sys.argv) < 3:
        print("Usage: translator.py <text> <target_language> [source_language]", file=sys.stderr)
        print("       translator.py detect <text>", file=sys.stderr)
        print("", file=sys.stderr)
        print("Examples:", file=sys.stderr)
        print("  translator.py 'Hello world' spanish", file=sys.stderr)
        print("  translator.py 'Hello world' es en", file=sys.stderr)
        print("  translator.py detect 'Hola mundo'", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]

    # Detection mode
    if command == 'detect':
        if len(sys.argv) < 3:
            print("Usage: translator.py detect <text>", file=sys.stderr)
            sys.exit(1)
        text = sys.argv[2]
        detected = detect_language(text)
        if detected:
            print(detected)
        else:
            print("unknown")
        sys.exit(0)

    # Translation mode
    text = sys.argv[1]
    target_lang = sys.argv[2]
    source_lang = sys.argv[3] if len(sys.argv) > 3 else 'en'

    translated, success = translate(text, target_lang, source_lang)

    # Output the result (for shell script consumption)
    print(translated)

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
