from pathlib import Path

from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
CATALOG_DIR = ROOT / "public" / "assets" / "catalog"


def flood_background(image):
    rgb = np.asarray(image.convert("RGB")).astype(np.int16)
    height, width = rgb.shape[:2]
    corners = [
        rgb[0, 0],
        rgb[0, width - 1],
        rgb[height - 1, 0],
        rgb[height - 1, width - 1],
    ]
    corner = np.mean(corners, axis=0)
    close_to_corner = np.abs(rgb - corner).sum(axis=2) < 7
    neutral = (rgb.max(axis=2) - rgb.min(axis=2)) < 12
    candidates = close_to_corner & neutral
    labels, _ = ndimage.label(candidates)
    edge_labels = np.unique(np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge_labels[edge_labels != 0])
    mask = Image.fromarray((background.astype(np.uint8) * 255), mode="L")
    return mask.filter(ImageFilter.GaussianBlur(1.1))


def plate_color(source):
    name = source.stem.lower()
    if "-noir" in name:
        return "#d8d0c2"
    return "#18251f"


def create_cutout(source):
    image = Image.open(source).convert("RGB")
    if max(image.size) > 1100:
        image.thumbnail((1100, 1100), Image.Resampling.LANCZOS)
    background = flood_background(image)
    plate = Image.new("RGB", image.size, plate_color(source))
    image = Image.composite(plate, image, background)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=4))
    output = source.with_name(f"{source.stem}-studio{source.suffix}")
    image.save(output, quality=88, method=2)
    return output


def main():
    outputs = []
    for source in sorted(CATALOG_DIR.glob("elko*.webp")):
        if source.stem.endswith("-studio"):
            continue
        outputs.append(create_cutout(source))
    print(f"created {len(outputs)} ELKO studio cutouts")


if __name__ == "__main__":
    main()
