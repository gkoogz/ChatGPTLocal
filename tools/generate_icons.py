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

    # Windows often chooses the 32px or 48px frame for Start/search results.
    # Give the badge a little more real estate in those frames so it survives
    # the downsample without changing the full-size artwork.
    badge_multiplier = 1.4 if size <= 48 else (1.25 if size <= 64 else (1.1 if size <= 128 else 1.0))

    def badge_box(values: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        left, top, right, bottom = values
        left = 256 - (256 - left) * badge_multiplier
        top = 256 - (256 - top) * badge_multiplier
        right = 256 - (256 - right) * badge_multiplier
        bottom = 256 - (256 - bottom) * badge_multiplier
        return box((round(left), round(top), round(right), round(bottom)))

    def badge_points(values: list[tuple[int, int]]) -> list[tuple[int, int]]:
        return [
            (round((256 - (256 - x) * badge_multiplier) * scale),
             round((256 - (256 - y) * badge_multiplier) * scale))
            for x, y in values
        ]

    # Clear a transparent pocket so the monitor slightly overlaps rather than
    # merely sitting on top of the official logo.
    draw.rounded_rectangle(badge_box((153, 159, 247, 229)), radius=round(15 * scale * badge_multiplier), fill=(0, 0, 0, 0))
    draw.polygon(badge_points([(184, 214), (218, 214), (218, 225), (230, 225), (230, 238), (170, 238), (170, 225), (184, 225)]), fill=(0, 0, 0, 0))

    monitor = badge_box((160, 165, 242, 220))
    radius = round(7 * scale * badge_multiplier)
    # Match the heavy white stroke of the source ChatGPT mark rather than
    # using a thin generic UI outline.
    line_width = round(12 * scale)
    white = "#f4f4f4"
    black = "#050505"
    draw.rounded_rectangle(monitor, radius=radius, fill=white)
    draw.rounded_rectangle(badge_box((172, 177, 230, 208)), radius=round(3 * scale * badge_multiplier), fill=black)
    draw.line(badge_points([(188, 226), (216, 226)]), fill=white, width=line_width)
    draw.line(badge_points([(202, 220), (202, 226)]), fill=white, width=line_width)

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
