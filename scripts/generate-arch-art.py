"""
AgentVibes Architecture Art Generator v2
- Draws diagrams natively with matplotlib (dark neon style, transparent bg)
- Generates cinematic spy background via Gemini Imagen 4 Ultra
- Composites: transparent diagram floats over the background
- No white Mermaid overlay
"""

import os, sys, io, math
from pathlib import Path
from io import BytesIO

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
    import matplotlib.patheffects as pe
    import numpy as np
except ImportError:
    print("ERROR: pip install matplotlib numpy")
    sys.exit(1)

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont
except ImportError:
    print("ERROR: pip install pillow")
    sys.exit(1)

try:
    from google import genai
    from google.genai import types as gtypes
except ImportError:
    print("ERROR: pip install google-genai")
    sys.exit(1)

API_KEY = (
    os.environ.get("GEMINI")
    or os.environ.get("GEMINI_API_KEY")
    or os.environ.get("GOOGLE_API_KEY")
)
if not API_KEY:
    print("ERROR: No Gemini key found")
    sys.exit(1)

OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", str(Path(__file__).parent.parent / "docs" / "architecture")))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Colour palette ────────────────────────────────────────────────────────────
C_BG        = "#050d14"          # deep navy (diagram panel bg)
C_NODE_BG   = "#0a1f2e"          # dark teal-blue fill
C_NODE_BDR  = "#00e5cc"          # neon teal border
C_NODE_TXT  = "#e8f8ff"          # near-white text
C_HEADER    = "#00e5cc"          # section header text
C_ARROW     = "#7f5af0"          # purple arrows
C_ACCENT    = "#ff6b9d"          # pink accent (audio output)
C_SECTION   = "#071520"          # section bg
C_TITLE     = "#00e5cc"          # diagram title


def glow(color, lw=2.5):
    """Path effect for borders/lines only — NOT for text."""
    return [
        pe.withStroke(linewidth=lw * 4, foreground=color + "44"),
        pe.withStroke(linewidth=lw * 2, foreground=color + "88"),
        pe.Normal(),
    ]


# Crisp dark outline — use this on ALL text so it's readable over any background
TEXT_OUTLINE = [pe.withStroke(linewidth=2.2, foreground="#000000cc"), pe.Normal()]
SUBTEXT_OUTLINE = [pe.withStroke(linewidth=1.6, foreground="#000000bb"), pe.Normal()]


def draw_box(ax, x, y, w, h, label, sublabel=None, color=C_NODE_BDR, alpha=0.92):
    """Draw a rounded node box with optional sub-label."""
    box = FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.015",
        linewidth=1.6,
        edgecolor=color,
        facecolor=C_NODE_BG,
        alpha=alpha,
        zorder=3,
    )
    box.set_path_effects([
        pe.withStroke(linewidth=5, foreground=color + "33"),
        pe.Normal(),
    ])
    ax.add_patch(box)

    if sublabel:
        ax.text(x, y + 0.025, label, ha="center", va="center",
                fontsize=7.2, fontweight="bold", color=C_NODE_TXT, zorder=4,
                path_effects=TEXT_OUTLINE)
        ax.text(x, y - 0.028, sublabel, ha="center", va="center",
                fontsize=5.5, color=color + "cc", zorder=4,
                path_effects=SUBTEXT_OUTLINE)
    else:
        ax.text(x, y, label, ha="center", va="center",
                fontsize=7.2, fontweight="bold", color=C_NODE_TXT, zorder=4,
                path_effects=TEXT_OUTLINE)


def draw_section(ax, x, y, w, h, title, color=C_NODE_BDR):
    """Draw a labelled section background."""
    rect = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.01",
        linewidth=1.2,
        edgecolor=color + "88",
        facecolor=C_SECTION,
        alpha=0.7,
        zorder=1,
    )
    ax.add_patch(rect)
    ax.text(x + w / 2, y + h + 0.01, title, ha="center", va="bottom",
            fontsize=6.5, color=color, fontweight="bold", zorder=5,
            path_effects=TEXT_OUTLINE)


def arrow(ax, x1, y1, x2, y2, color=C_ARROW):
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle="-|>",
            color=color,
            lw=1.4,
            mutation_scale=10,
            connectionstyle="arc3,rad=0.0",
        ),
        zorder=2,
    )
    # glow line underneath
    ax.plot([x1, x2], [y1, y2], color=color + "44", lw=4, zorder=1)


# ── Diagram 1: System Overview ────────────────────────────────────────────────
def draw_system_overview() -> Image.Image:
    fig, ax = plt.subplots(figsize=(16, 9))
    fig.patch.set_facecolor("none")
    fig.patch.set_alpha(0)
    ax.set_facecolor("none")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # Title
    ax.text(0.5, 0.96, "AgentVibes  —  System Architecture",
            ha="center", va="top", fontsize=15, fontweight="bold",
            color=C_TITLE, zorder=10,
            path_effects=TEXT_OUTLINE)

    # ── Column x positions
    CX = [0.09, 0.24, 0.42, 0.60, 0.78, 0.93]
    BW, BH = 0.115, 0.072

    # ── Row 1: User Interfaces ─────────────────────────────────────────────
    draw_section(ax, 0.01, 0.76, 0.20, 0.16, "User Interfaces")
    draw_box(ax, CX[0], 0.885, BW, BH, "Claude Code CLI")
    draw_box(ax, CX[0], 0.815, BW, BH, "Claude Desktop", "/ Warp")
    draw_box(ax, CX[0], 0.745, BW, BH, "Voice Browser", "TUI")

    # ── Row 1: Entry Layer ─────────────────────────────────────────────────
    draw_section(ax, 0.165, 0.76, 0.20, 0.16, "Entry Layer")
    draw_box(ax, CX[1], 0.885, BW, BH, "SessionStart", "Hook")
    draw_box(ax, CX[1], 0.815, BW, BH, "MCP Server", "mcp-server/server.py")
    draw_box(ax, CX[1], 0.745, BW, BH, "Slash Commands", ".claude/commands/")

    # ── Core Pipeline ──────────────────────────────────────────────────────
    draw_section(ax, 0.325, 0.48, 0.23, 0.45, "Core TTS Pipeline")
    draw_box(ax, CX[2], 0.885, BW + 0.01, BH, "TTS Router", "play-tts.sh / .ps1", color="#ff9f1c")
    draw_box(ax, CX[2], 0.795, BW, BH, "TTS Queue", "tts-queue.sh")
    draw_box(ax, CX[2], 0.715, BW, BH, "Audio Processor", "audio-processor.sh")
    draw_box(ax, 0.385, 0.630, BW, BH, "Background", "Music")
    draw_box(ax, 0.455, 0.630, BW, BH, "Effects", "Manager")

    # ── Managers ──────────────────────────────────────────────────────────
    draw_section(ax, 0.545, 0.62, 0.195, 0.32, "Managers")
    draw_box(ax, CX[3], 0.885, BW, BH, "Provider Manager")
    draw_box(ax, CX[3], 0.815, BW, BH, "Voice Manager")
    draw_box(ax, CX[3], 0.745, BW, BH, "Personality", "Manager")
    draw_box(ax, CX[3], 0.675, BW, BH, "Language + Speed", "Managers")

    # ── TTS Providers ──────────────────────────────────────────────────────
    draw_section(ax, 0.325, 0.10, 0.415, 0.36, "TTS Providers")
    providers = [
        ("Piper TTS",     "Local Neural",    0.375, 0.40),
        ("macOS Say",     "Native",          0.445, 0.40),
        ("Windows SAPI",  "Native",          0.515, 0.40),
        ("Windows Piper", "Neural",          0.585, 0.40),
        ("SSH Remote",    None,              0.655, 0.40),
        ("Soprano",       "Gradio API",      0.725, 0.40),
    ]
    for lbl, sub, px, _ in providers:
        draw_box(ax, px, 0.36, BW - 0.01, BH, lbl, sub, color="#4ecdc4")

    # Local vs Remote audio
    draw_box(ax, 0.45, 0.19, 0.14, BH, "Local Audio", "mpv / afplay / SAPI", color=C_ACCENT)
    draw_box(ax, 0.63, 0.19, 0.10, BH, "Remote Audio", "target host", color=C_ACCENT)

    # ── Config ────────────────────────────────────────────────────────────
    draw_section(ax, 0.74, 0.10, 0.245, 0.32, "State & Config")
    draw_box(ax, CX[5], 0.375, BW, BH, "Config Files", ".claude/*.txt")
    draw_box(ax, CX[5], 0.295, BW, BH, "Personalities", ".claude/personalities/")
    draw_box(ax, CX[5], 0.215, BW, BH, "BMAD Voices", ".agentvibes/bmad/")

    # ── Arrows ────────────────────────────────────────────────────────────
    # User → Entry
    for y in [0.885, 0.815, 0.745]:
        arrow(ax, CX[0] + BW / 2, y, CX[1] - BW / 2, y)

    # Entry → Router
    for y in [0.885, 0.815, 0.745]:
        arrow(ax, CX[1] + BW / 2, y, CX[2] - BW / 2 - 0.005, 0.885)

    # Router → Queue → AP
    arrow(ax, CX[2], 0.849, CX[2], 0.831)
    arrow(ax, CX[2], 0.759, CX[2], 0.751)
    # AP → BG/FX
    arrow(ax, 0.40, 0.679, 0.385, 0.666)
    arrow(ax, 0.44, 0.679, 0.455, 0.666)
    # AP → Providers
    for px, _, _, _ in providers:
        arrow(ax, CX[2], 0.679, px, 0.396)

    # Providers → Audio
    for px, _, _, _ in providers[:4]:
        arrow(ax, px, 0.324, 0.45, 0.226, color=C_ACCENT)
    for px, _, _, _ in providers[4:]:
        arrow(ax, px, 0.324, 0.63, 0.226, color=C_ACCENT)

    # Managers → Config
    for y in [0.885, 0.815, 0.745, 0.675]:
        arrow(ax, CX[3] + BW / 2, y, CX[5] - BW / 2, 0.375, color="#4ecdc4")

    buf = BytesIO()
    plt.savefig(buf, format="png", dpi=160, bbox_inches="tight",
                facecolor="none", transparent=True)
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert("RGBA")


# ── Diagram 2: Provider Architecture ─────────────────────────────────────────
def draw_provider_architecture() -> Image.Image:
    fig, ax = plt.subplots(figsize=(16, 9))
    fig.patch.set_facecolor("none")
    fig.patch.set_alpha(0)
    ax.set_facecolor("none")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    ax.text(0.5, 0.96, "AgentVibes  —  Provider Architecture",
            ha="center", va="top", fontsize=15, fontweight="bold",
            color=C_TITLE, zorder=10,
            path_effects=TEXT_OUTLINE)

    BW, BH = 0.13, 0.08

    # Selection state
    draw_section(ax, 0.02, 0.66, 0.20, 0.22, "Provider Selection")
    draw_box(ax, 0.12, 0.83, BW + 0.02, BH, "tts-provider.txt", "project-local → global")
    draw_box(ax, 0.12, 0.72, BW + 0.02, BH, "Per-LLM Override", "audio-effects.cfg")

    # Router
    draw_box(ax, 0.38, 0.77, BW + 0.04, BH + 0.02, "TTS Router",
             "play-tts.sh / play-tts.ps1", color="#ff9f1c")

    # Local providers
    draw_section(ax, 0.55, 0.62, 0.43, 0.32, "Local Providers")
    local = [
        ("Piper TTS",     "Linux/macOS/WSL\n150+ voices",  0.62, 0.82),
        ("macOS Say",     "macOS only\n70+ voices",         0.75, 0.82),
        ("Windows SAPI",  "Windows native",                 0.62, 0.72),
        ("Windows Piper", "Windows neural",                 0.75, 0.72),
    ]
    for lbl, sub, px, py in local:
        draw_box(ax, px, py, BW + 0.01, BH, lbl, sub, color="#4ecdc4")

    # Remote providers
    draw_section(ax, 0.55, 0.22, 0.43, 0.32, "Remote / API Providers")
    remote = [
        ("SSH Remote",    "Forwards to remote host", 0.62, 0.47),
        ("Soprano",       "Gradio API endpoint",     0.75, 0.47),
        ("Termux SSH",    "Android audio",           0.62, 0.35),
        ("AV Receiver",   "Voiceless proxy",         0.75, 0.35),
    ]
    for lbl, sub, px, py in remote:
        draw_box(ax, px, py, BW + 0.01, BH, lbl, sub, color="#7f5af0")

    # Audio outputs
    draw_box(ax, 0.685, 0.14, 0.115, BH, "Local Audio", "mpv / afplay / SAPI", color=C_ACCENT)
    draw_box(ax, 0.82, 0.14, 0.115, BH, "Remote Audio", "plays on target host", color=C_ACCENT)

    # Arrows: state → router
    arrow(ax, 0.23, 0.83, 0.345, 0.79)
    arrow(ax, 0.23, 0.72, 0.345, 0.76)

    # Router → local providers
    for lbl, sub, px, py in local:
        arrow(ax, 0.415, 0.77, px - BW / 2 - 0.005, py)

    # Router → remote providers
    for lbl, sub, px, py in remote:
        arrow(ax, 0.415, 0.74, px - BW / 2 - 0.005, py)

    # Local → local audio
    for lbl, sub, px, py in local:
        arrow(ax, px, py - BH / 2, 0.685, 0.18, color=C_ACCENT)

    # Remote → remote audio
    for lbl, sub, px, py in remote:
        arrow(ax, px, py - BH / 2, 0.82, 0.18, color="#7f5af0")

    buf = BytesIO()
    plt.savefig(buf, format="png", dpi=160, bbox_inches="tight",
                facecolor="none", transparent=True)
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert("RGBA")


# ── Diagram 3: TTS Request Flow ───────────────────────────────────────────────
def draw_tts_flow() -> Image.Image:
    fig, ax = plt.subplots(figsize=(16, 9))
    fig.patch.set_facecolor("none")
    fig.patch.set_alpha(0)
    ax.set_facecolor("none")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    ax.text(0.5, 0.96, "AgentVibes  —  TTS Request Flow",
            ha="center", va="top", fontsize=15, fontweight="bold",
            color=C_TITLE, zorder=10,
            path_effects=TEXT_OUTLINE)

    # Participants (columns)
    participants = [
        ("User",              0.08,  "#ff9f1c"),
        ("Claude AI",         0.22,  "#00e5cc"),
        ("SessionStart\nHook",0.36,  "#4ecdc4"),
        ("TTS Router",        0.50,  "#ff9f1c"),
        ("Provider\nManager", 0.64,  "#4ecdc4"),
        ("Audio\nProcessor",  0.78,  "#7f5af0"),
        ("TTS Provider",      0.92,  "#4ecdc4"),
    ]

    BH = 0.065
    for label, px, color in participants:
        draw_box(ax, px, 0.88, 0.10, BH, label, color=color)
        # lifeline
        ax.plot([px, px], [0.847, 0.05], color=color + "55", lw=1.2,
                linestyle="--", zorder=1)

    # Messages (y positions descending)
    messages = [
        (0, 1, 0.80, "Start Claude Code session",          C_NODE_BDR),
        (2, 1, 0.73, "Inject TTS protocol + settings",     "#4ecdc4"),
        (0, 1, 0.66, '"Check git status"',                 "#ff9f1c"),
        (1, 3, 0.59, "play-tts.sh acknowledgment",         C_ARROW),
        (3, 4, 0.53, "get_active_provider()",              C_ARROW),
        (4, 3, 0.47, '"piper"',                            "#4ecdc4"),
        (3, 5, 0.41, "route to Piper with voice",          C_ARROW),
        (5, 6, 0.36, "synthesize WAV audio",               "#7f5af0"),
        (6, 5, 0.30, "WAV returned",                       "#4ecdc4"),
        (5, 0, 0.24, "audio plays + effects + bg music",   C_ACCENT),
        (1, 3, 0.17, "play-tts.sh completion",             C_ARROW),
        (3, 6, 0.11, "synthesize + play",                  C_ARROW),
    ]

    for src, dst, y, label, color in messages:
        x1 = participants[src][1]
        x2 = participants[dst][1]
        arrow(ax, x1, y, x2, y, color=color)
        mid = (x1 + x2) / 2
        offset = 0.015 if x2 > x1 else -0.015
        ax.text(mid, y + 0.022, label, ha="center", va="bottom",
                fontsize=6.0, color=color, zorder=5,
                path_effects=SUBTEXT_OUTLINE)

    buf = BytesIO()
    plt.savefig(buf, format="png", dpi=160, bbox_inches="tight",
                facecolor="none", transparent=True)
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert("RGBA")


# ── Background generation ─────────────────────────────────────────────────────
BG_PROMPTS = {
    "system-overview": (
        "Cinematic secret agent command center, extreme wide shot, dark atmospheric, "
        "dramatic neon signs in teal and electric purple glowing 'AGENT VIBES', "
        "mysterious silhouette of a spy in a trench coat in background shadows, "
        "holographic blue grid lines on floor, swirling teal and violet smoke, "
        "terminal green glow on walls, moody film noir, ultra-detailed photorealistic, "
        "NO text overlays, NO diagrams, pure atmospheric background, 16:9"
    ),
    "provider-architecture": (
        "Cinematic spy network operations center, multiple holographic screens glowing, "
        "dark room with electric teal and violet neon lights, secret agent silhouette "
        "at a console in deep shadow, swirling cinematic fog, dramatic spotlight rays, "
        "cyberpunk aesthetic, NO text, NO diagrams, pure atmospheric background, 16:9"
    ),
    "tts-flow": (
        "Cinematic dark server room with glowing racks of lights, secret agent intercepting "
        "data transmissions, electric teal neon reflections on wet floor, dramatic purple "
        "and cyan lighting, cinematic smoke and fog, holographic data streams in air, "
        "NO text, NO diagrams, pure atmospheric background, ultra-detailed photorealistic, 16:9"
    ),
}


def generate_background(key: str, client) -> Image.Image:
    print(f"  Generating Imagen 4 Ultra background...")
    resp = client.models.generate_images(
        model="imagen-4.0-ultra-generate-001",
        prompt=BG_PROMPTS[key],
        config=gtypes.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="16:9",
            safety_filter_level="block_low_and_above",
        ),
    )
    return Image.open(BytesIO(resp.generated_images[0].image.image_bytes)).convert("RGBA")


# ── Composite ─────────────────────────────────────────────────────────────────
def composite(bg: Image.Image, diagram: Image.Image, title: str) -> Image.Image:
    W, H = 1920, 1080
    bg = bg.resize((W, H), Image.LANCZOS)

    # Slightly darken bg so the neon diagram pops
    bg = ImageEnhance.Brightness(bg).enhance(0.60)

    # Scale diagram to fill 90% of canvas (it's transparent — no white box)
    dw, dh = diagram.size
    scale = min(W * 0.92 / dw, H * 0.92 / dh)
    new_w, new_h = int(dw * scale), int(dh * scale)
    diagram = diagram.resize((new_w, new_h), Image.LANCZOS)

    # Centre it
    x = (W - new_w) // 2
    y = (H - new_h) // 2
    bg.alpha_composite(diagram, (x, y))

    # Subtle neon footer
    draw = ImageDraw.Draw(bg)
    draw.rectangle([(0, H - 36), (W, H)], fill=(0, 0, 0, 160))
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 20)
        font_sm = ImageFont.truetype("DejaVuSans.ttf", 15)
    except Exception:
        font = font_sm = ImageFont.load_default()
    draw.text((28, H - 26), f"AgentVibes v5.7.7  •  {title}",
              fill=(0, 229, 204, 230), font=font)
    draw.text((W - 220, H - 22), "agentvibes.org",
              fill=(127, 90, 240, 180), font=font_sm)

    return bg.convert("RGB")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--reuse-bg", action="store_true",
                        help="Reuse existing background PNGs instead of re-generating")
    args, _ = parser.parse_known_args()

    client = genai.Client(api_key=API_KEY)

    jobs = [
        ("system-overview",       "System Architecture",    draw_system_overview),
        ("provider-architecture", "Provider Architecture",  draw_provider_architecture),
        ("tts-flow",              "TTS Request Flow",       draw_tts_flow),
    ]

    outputs = []
    for key, title, draw_fn in jobs:
        out = OUTPUT_DIR / f"arch-art-{key}.png"
        bg_cache = OUTPUT_DIR / f"arch-art-{key}-bg.png"
        print(f"\n[{key}]")
        try:
            diagram = draw_fn()
            print(f"  Diagram drawn ({diagram.size[0]}×{diagram.size[1]})")

            if args.reuse_bg and bg_cache.exists():
                print(f"  Reusing cached background")
                bg = Image.open(bg_cache).convert("RGBA")
            else:
                bg = generate_background(key, client)
                bg.save(str(bg_cache), "PNG")   # cache for next run

            result = composite(bg, diagram, title)
            result.save(str(out), "PNG", optimize=True)
            print(f"  Saved → {out}")
            outputs.append(str(out))
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback; traceback.print_exc()

    print("\n=== OUTPUT FILES ===")
    for p in outputs:
        print(p)


if __name__ == "__main__":
    main()
