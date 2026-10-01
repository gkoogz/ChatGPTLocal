"""Generate the Windows ICO and preview PNGs for ChatGPT Local.

The artwork is intentionally recreated from simple primitives so icon builds do
not depend on a network service or a proprietary source asset.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "icons"


def rotate(point: tuple[float, float], angle: float, center: tuple[float, float]) -> tuple[float, float]:
    px, py = point
    cx, cy = center
    radians = math.radians(angle)
    x = px - cx
    y = py - cy
    return (x * math.cos(radians) - y * math.sin(radians) + cx,
            x * math.sin(radians) + y * math.cos(radians) + cy)


def draw_icon(size: int, monitor_color: str = "#a8e6cf") -> Image.Image:
    scale = size / 256
    image = Image.new("RGBA", (size, size), "#050505")
    draw = ImageDraw.Draw(image)
    radius = int(54 * scale)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill="#050505")

    stroke = max(2, int(14 * scale))
    center = (128 * scale, 128 * scale)
    box = (92 * scale, 14 * scale, 164 * scale, 154 * scale)
    for angle in (30, 90, 150):
        points = []
        for step in range(121):
            theta = math.pi * 2 * step / 120
            x = 128 * scale + 36 * scale * math.cos(theta)
            y = 84 * scale + 70 * scale * math.sin(theta)
            points.append(rotate((x, y), angle, center))
        draw.line(points, fill="#f2f2f2", width=stroke, joint="curve")

    x0, y0 = 152 * scale, 160 * scale
    x1, y1 = 228 * scale, 209 * scale
    badge_stroke = max(2, int(8 * scale))
    draw.rounded_rectangle((x0, y0, x1, y1), radius=max(2, int(7 * scale)), fill=monitor_color, outline="#050505", width=badge_stroke)
    draw.rounded_rectangle((x0 + 8 * scale, y0 + 8 * scale, x1 - 8 * scale, y0 + 40 * scale), radius=max(1, int(3 * scale)), fill="#101916")
    draw.line((178 * scale, 221 * scale, 202 * scale, 221 * scale), fill=monitor_color, width=stroke, joint="curve")
    draw.line((190 * scale, 209 * scale, 190 * scale, 221 * scale), fill=monitor_color, width=stroke)
    return image


def main(check: bool = False) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sizes = (16, 24, 32, 48, 64, 128, 256)
    expected = [OUT / "chatgpt-local.ico", *[OUT / f"chatgpt-local-{size}.png" for size in sizes]]
    if check:
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
