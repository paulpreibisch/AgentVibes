#!/usr/bin/env python3
"""
AgentVibes — Kokoro TTS synthesizer
Synthesizes text to a WAV file using the kokoro-onnx package.
Prints the output WAV path to stdout.

Usage: kokoro-tts.py <text> <voice> <output_path> [speed]

Voices (examples):
  af_heart  af_nova  af_sky  af_bella  af_sarah  af_nicole
  am_adam   am_michael
  bf_emma   bf_isabella
  bm_george bm_lewis

Install: pip install kokoro-onnx soundfile numpy
"""

import sys
import os

def main():
    # --download-only: fetch voice .pt file from HuggingFace without synthesis
    if len(sys.argv) >= 2 and sys.argv[1] == '--download-only':
        voice = sys.argv[2] if len(sys.argv) > 2 else 'af_heart'
        try:
            from huggingface_hub import hf_hub_download
            local = hf_hub_download(repo_id='hexgrad/Kokoro-82M', filename=f'voices/{voice}.pt')
            print(local)
        except Exception as e:
            print(f"❌ Download failed: {e}", file=sys.stderr)
            sys.exit(4)
        sys.exit(0)

    if len(sys.argv) < 4:
        print("Usage: kokoro-tts.py <text> <voice> <output_path> [speed]", file=sys.stderr)
        sys.exit(1)

    text = sys.argv[1]
    voice = sys.argv[2]
    output_path = sys.argv[3]
    speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0

    # Determine language code from voice prefix
    # af/am = American English ('a'), bf/bm = British English ('b')
    # jf/jm = Japanese ('j'), kf/km = Korean ('k'), etc.
    prefix = voice[:2].lower() if len(voice) >= 2 else 'af'
    lang_map = {
        'af': 'a', 'am': 'a',  # American English
        'bf': 'b', 'bm': 'b',  # British English
        'jf': 'j', 'jm': 'j',  # Japanese
        'kf': 'k', 'km': 'k',  # Korean
        'zf': 'z', 'zm': 'z',  # Mandarin
        'ff': 'f', 'fm': 'f',  # French
        'hf': 'h', 'hm': 'h',  # Hindi
        'if': 'i', 'im': 'i',  # Italian
        'pf': 'p', 'pm': 'p',  # Brazilian Portuguese
        'ef': 'e', 'em': 'e',  # Spanish (Spain)
        'nf': 'n', 'nm': 'n',  # Spanish (Latin America)
    }
    lang_code = lang_map.get(prefix, 'a')

    try:
        from kokoro import KPipeline
    except ImportError:
        print("❌ kokoro-onnx not installed. Run: pip install kokoro-onnx soundfile numpy", file=sys.stderr)
        sys.exit(2)

    try:
        import numpy as np
        import soundfile as sf
    except ImportError:
        print("❌ soundfile/numpy not installed. Run: pip install soundfile numpy", file=sys.stderr)
        sys.exit(2)

    try:
        pipeline = KPipeline(lang_code=lang_code)
        generator = pipeline(text, voice=voice, speed=speed)

        all_samples = []
        sample_rate = 24000  # kokoro always outputs 24 kHz

        for result in generator:
            # kokoro >=0.9 yields a KPipeline.Result whose waveform is the
            # `.audio` attribute (a torch.Tensor); older builds yield a
            # (graphemes, phonemes, audio) tuple. Prefer `.audio`, then fall
            # back to the last tuple element.
            audio = getattr(result, "audio", None)
            if audio is None:
                try:
                    audio = result[-1]
                except (TypeError, IndexError, KeyError):
                    audio = None
            if audio is None:
                continue
            # Tensor -> numpy, force 1-D so np.concatenate never sees a 0-d array
            if hasattr(audio, "detach"):
                audio = audio.detach().cpu().numpy()
            audio = np.asarray(audio).reshape(-1)
            if audio.size > 0:
                all_samples.append(audio)

        if not all_samples:
            print("❌ Kokoro returned no audio samples", file=sys.stderr)
            sys.exit(3)

        combined = np.concatenate(all_samples)
        sf.write(output_path, combined, sample_rate)
        print(output_path)

    except Exception as e:
        print(f"❌ Kokoro synthesis failed: {e}", file=sys.stderr)
        sys.exit(3)


if __name__ == '__main__':
    main()
