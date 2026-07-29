"""Extract a subsample of the Pyronear dataset (French SDIS wildfire camera
network -- Force 06, SDIS 07/12/77) from the HF datasets cache to individual
JPEG files with a manifest of real bounding-box coverage per image.

This is the first source added beyond HPWREN (Southern California) for
genuine geographic diversity -- see ml_pipeline/README.md. Unlike HPWREN's
timestamp-offset proxy, Pyronear ships real smoke bounding boxes, so
coverage fraction here is an actual density signal, not a heuristic.

Subsampled (not all 33,636 images) to keep local disk/training time
reasonable for a season 1 pass -- see SAMPLE_SIZE below.

Run from backend/ (after Pyronear has already been downloaded to
data/raw/pyronear_hf_cache via `load_dataset`):
`python -m ml_pipeline.scripts.extract_pyronear`
"""

import json
import os
import random
from pathlib import Path

os.environ.setdefault(
    "HF_HOME", str(Path(__file__).resolve().parent.parent / "data" / "raw" / "pyronear_hf_cache")
)

from datasets import load_dataset  # noqa: E402

from ml_pipeline.scripts.bbox_utils import parse_yolo_coverage  # noqa: E402

_OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "pyronear" / "images"
_MANIFEST = Path(__file__).resolve().parent.parent / "data" / "raw" / "pyronear" / "manifest.jsonl"
_SAMPLE_SIZE = 6500
_SEED = 42


def main() -> None:
    ds = load_dataset("pyronear/pyro-sdis")
    _OUT_DIR.mkdir(parents=True, exist_ok=True)

    rng = random.Random(_SEED)
    manifest_lines = []
    extracted = 0

    for split_name in ds:
        split = ds[split_name]
        indices = list(range(len(split)))
        rng.shuffle(indices)
        # Proportional subsample per split so train/val naturally carries
        # through rather than skewing entirely from one.
        take = round(_SAMPLE_SIZE * len(split) / (len(ds["train"]) + len(ds.get("val", []))))
        for i in indices[:take]:
            ex = split[i]
            coverage = parse_yolo_coverage(ex["annotations"])
            filename = f"pyronear_{split_name}_{i:06d}.jpg"
            dest = _OUT_DIR / filename
            ex["image"].convert("RGB").save(dest, "JPEG", quality=90)
            manifest_lines.append(
                json.dumps(
                    {
                        "filename": filename,
                        "coverage": coverage,
                        "partner": ex.get("partner"),
                        "camera": ex.get("camera"),
                    }
                )
            )
            extracted += 1

    _MANIFEST.write_text("\n".join(manifest_lines))
    print(f"Extracted {extracted} Pyronear images -> {_OUT_DIR}")
    with_smoke = sum(1 for line in manifest_lines if json.loads(line)["coverage"] > 0)
    print(f"  with smoke boxes: {with_smoke}, without: {extracted - with_smoke}")


if __name__ == "__main__":
    main()
