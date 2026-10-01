"""Overlay a minimal monitor badge on the installed Codex ChatGPT icon."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "icons"
SOURCE = OUT / "chatgpt-codex-dark.ico"


def draw_icon(size: int) -> Image.Image:
    """Keep the Codex logo pixels and add a knocked-out monitor badge."""
    work_size = 1024
    image = Image.open(SOURCE).convert("RGBA").resize((work_size, work_size), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(image)
    scale = work_size / 256

    def box(values: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        return tuple(round(value * scale) for value in values)

    def points(values: list[tuple[int, int]]) -> list[tuple[int, int]]:
        return [(round(x * scale), round(y * scale)) for x, y in values]

    # Clear a transparent pocket so the monitor slightly overlaps rather than
    # merely sitting on top of the official logo.
    draw.rounded_rectangle(box((153, 159, 247, 229)), radius=round(15 * scale), fill=(0, 0, 0, 0))
    draw.polygon(points([(184, 214), (218, 214), (218, 225), (230, 225), (230, 238), (170, 238), (170, 225), (184, 225)]), fill=(0, 0, 0, 0))

    monitor = box((160, 165, 242, 220))
    radius = round(7 * scale)
    outline = round(4 * scale)
    draw.rounded_rectangle(monitor, radius=radius, fill="#f4f4f4")
    draw.rounded_rectangle(box((168, 173, 234, 211)), radius=round(3 * scale), fill="#050505")
    draw.rounded_rectangle(box((172, 177, 230, 207)), radius=round(2 * scale), outline="#a8e6cf", width=round(2 * scale))
    draw.line(points([(188, 226), (216, 226)]), fill="#f4f4f4", width=outline)
    draw.line(points([(202, 220), (202, 226)]), fill="#f4f4f4", width=outline)

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main(check: bool = False) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sizes = (16, 24, 32, 48, 64, 128, 256)
    expected = [OUT / "chatgpt-local.ico", *[OUT / f"chatgpt-local-{size}.png" for size in sizes]]
    if check:
        if not SOURCE.exists():
            raise SystemExit(f"Missing installed Codex icon source: {SOURCE}")
        missing = [str(path) for path in expected if not path.exists()]
        if missing:
            raise SystemExit("Missing generated icon files: " + ", ".join(missing))
        return

    images = [draw_icon(size) for size in sizes]
    for size, image in zip(sizes, images):
        image.save(OUT / f"chatgpt-local-{size}.png")
    images[-1].save(OUT / "chatgpt-local.ico", format="ICO", sizes=[(size, size) for size in sizes])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    main(check=parser.parse_args().check)
