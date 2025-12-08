#!/usr/bin/env python3
"""
VibeVoice TTS Wrapper for AgentVibes
Provides a simple interface to Microsoft's VibeVoice multi-speaker TTS model
"""

import sys
import argparse
import warnings
from pathlib import Path

try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import soundfile as sf
    import numpy as np
except ImportError as e:
    print(f"❌ Error: Missing required dependency: {e}", file=sys.stderr)
    print("Install dependencies: pip install -r requirements-vibevoice.txt", file=sys.stderr)
    sys.exit(1)

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')


class VibeVoiceWrapper:
    """Wrapper for VibeVoice TTS model"""

    def __init__(self, model_name="microsoft/VibeVoice-1.5B", device=None):
        """
        Initialize VibeVoice model

        Args:
            model_name: HuggingFace model identifier
            device: torch device (auto-detected if None)
        """
        self.model_name = model_name

        # Auto-detect device
        if device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
                # Check available VRAM
                total_vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
                print(f"🎮 Using GPU with {total_vram:.1f}GB VRAM", file=sys.stderr)
            else:
                self.device = "cpu"
                print("⚠️  No GPU detected, using CPU (will be slow)", file=sys.stderr)
        else:
            self.device = device

        self.model = None
        self.tokenizer = None
        self.loaded = False

    def load_model(self):
        """Load the VibeVoice model and tokenizer"""
        if self.loaded:
            return

        print(f"📥 Loading VibeVoice model: {self.model_name}", file=sys.stderr)
        print("⏳ This may take a while on first run (downloading model)...", file=sys.stderr)

        try:
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True
            )

            # Load model with optimizations for 6GB GPU
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                low_cpu_mem_usage=True,
                device_map="auto" if self.device == "cuda" else None
            )

            if self.device == "cpu":
                self.model = self.model.to(self.device)

            self.loaded = True
            print("✅ Model loaded successfully", file=sys.stderr)

        except Exception as e:
            print(f"❌ Failed to load model: {e}", file=sys.stderr)
            raise

    def synthesize(self, text, speaker_id=0, output_path=None):
        """
        Synthesize speech from text

        Args:
            text: Text to synthesize
            speaker_id: Speaker ID (0-3 for different voices)
            output_path: Where to save the audio (default: auto-generated)

        Returns:
            Path to generated audio file
        """
        if not self.loaded:
            self.load_model()

        print(f"🎙️  Synthesizing: '{text[:50]}...'", file=sys.stderr)
        print(f"👤 Using speaker ID: {speaker_id}", file=sys.stderr)

        try:
            # Prepare input with speaker tag
            # Note: Actual VibeVoice API may differ - this is a POC placeholder
            input_text = f"<speaker{speaker_id}> {text}"

            # Tokenize
            inputs = self.tokenizer(input_text, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Generate audio tokens (placeholder - actual VibeVoice API will differ)
            # This is conceptual code for the POC
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_length=1024,
                    do_sample=True,
                    temperature=0.8
                )

            # Decode audio (placeholder)
            # Real VibeVoice will have specific decoding method
            print("⚠️  POC: Using placeholder audio generation", file=sys.stderr)

            # Generate placeholder sine wave for POC
            sample_rate = 16000
            duration = len(text.split()) * 0.5  # ~0.5s per word estimate
            t = np.linspace(0, duration, int(sample_rate * duration))
            audio = np.sin(2 * np.pi * 440 * t) * 0.3  # 440Hz sine wave

            # Save audio
            if output_path is None:
                output_path = Path("/tmp") / f"vibevoice_{hash(text) % 10000}.wav"
            else:
                output_path = Path(output_path)

            output_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(output_path), audio, sample_rate)

            print(f"✅ Audio saved to: {output_path}", file=sys.stderr)
            return str(output_path)

        except Exception as e:
            print(f"❌ Synthesis failed: {e}", file=sys.stderr)
            raise


def main():
    """CLI interface for VibeVoice wrapper"""
    parser = argparse.ArgumentParser(description="VibeVoice TTS Wrapper")
    parser.add_argument("text", help="Text to synthesize")
    parser.add_argument("--speaker", type=int, default=0, choices=[0, 1, 2, 3],
                       help="Speaker ID (0-3)")
    parser.add_argument("--output", "-o", help="Output WAV file path")
    parser.add_argument("--model", default="microsoft/VibeVoice-1.5B",
                       help="Model name or path")

    args = parser.parse_args()

    try:
        # Initialize wrapper
        wrapper = VibeVoiceWrapper(model_name=args.model)

        # Synthesize
        output_path = wrapper.synthesize(
            text=args.text,
            speaker_id=args.speaker,
            output_path=args.output
        )

        # Print output path for shell script
        print(output_path)

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
