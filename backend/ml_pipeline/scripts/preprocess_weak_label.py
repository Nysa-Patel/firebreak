"""Combine three geographically distinct sources into a 3-class
(clear / hazy / heavy) train/val/test split:

  - HPWREN / AI For Mankind classification dataset (Southern California,
    USA) -- weak-labeled via timestamp-offset-from-onset (no real smoke
    boxes available for this source; see _label_hpwren()).
  - Pyronear (Force 06, SDIS 07/12/77 -- France) -- real YOLO bounding
    boxes; extracted by scripts/extract_pyronear.py into
    data/raw/pyronear/{images/, manifest.jsonl}.
  - SAINet (Cordoba, Argentina) -- real YOLO bounding boxes, downloaded
    directly to data/raw/sainet/data/{train,val}/{images,labels}/.

For the two real-bbox sources, smoke-coverage-area (sum of box areas / image
area) is a genuine density signal, not a heuristic -- see
ml_pipeline/README.md for why HPWREN alone couldn't use this. The
hazy/heavy split point for those two is computed from their own pooled
distribution below rather than hardcoded, so it adapts if the sample
changes.

Run from backend/: `python -m ml_pipeline.scripts.preprocess_weak_label`
"""

import json
import random
import re
import shutil
import statistics
from pathlib import Path

from ml_pipeline.scripts.bbox_utils import parse_yolo_coverage

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
_OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"
_SPOT_CHECK_FILE = Path(__file__).resolve().parent.parent / "spot_check_sample.txt"

_SPLIT = {"train": 0.70, "val": 0.15, "test": 0.15}
_SEED = 42
_SPOT_CHECK_SAMPLE_SIZE = 150

_HPWREN_FILENAME_RE = re.compile(r"^\d+_([+-]\d+)\.jpg$")
_HPWREN_HAZY_MAX_SECONDS = 600  # smoke images within 10 min of onset -> hazy, else heavy


def _label_hpwren() -> dict[str, list[Path]]:
    root = _DATA_DIR / "classification" / "challenge1"
    no_smoke_dir, smoke_dir = root / "no_smoke", root / "smoke"
    if not no_smoke_dir.exists():
        print(f"  (skipping HPWREN -- {no_smoke_dir} not found)")
        return {"clear": [], "hazy": [], "heavy": []}

    def real_jpgs(dir_path: Path) -> list[Path]:
        # macOS AppleDouble resource-fork junk (`._foo.jpg`) rides along in
        # the original tar archive -- exclude, not just "unparseable".
        return sorted(p for p in dir_path.glob("*.jpg") if not p.name.startswith("."))

    by_class: dict[str, list[Path]] = {"clear": [], "hazy": [], "heavy": []}
    for path in real_jpgs(no_smoke_dir):
        by_class["clear"].append(path)
    for path in real_jpgs(smoke_dir):
        match = _HPWREN_FILENAME_RE.match(path.name)
        if not match:
            continue
        offset = int(match.group(1))
        by_class["heavy" if offset > _HPWREN_HAZY_MAX_SECONDS else "hazy"].append(path)
    return by_class


def _pyronear_items() -> list[tuple[Path, float]]:
    manifest_path = _DATA_DIR / "pyronear" / "manifest.jsonl"
    images_dir = _DATA_DIR / "pyronear" / "images"
    if not manifest_path.exists():
        print(f"  (skipping Pyronear -- {manifest_path} not found)")
        return []
    items = []
    for line in manifest_path.read_text().splitlines():
        entry = json.loads(line)
        items.append((images_dir / entry["filename"], entry["coverage"]))
    return items


def _sainet_items() -> list[tuple[Path, float]]:
    root = _DATA_DIR / "sainet" / "data"
    if not root.exists():
        print(f"  (skipping SAINet -- {root} not found)")
        return []
    items = []
    for split in ("train", "val"):
        images_dir, labels_dir = root / split / "images", root / split / "labels"
        if not images_dir.exists():
            continue
        for img_path in sorted(images_dir.glob("*.jpg")):
            label_path = labels_dir / f"{img_path.stem}.txt"
            text = label_path.read_text() if label_path.exists() else ""
            items.append((img_path, parse_yolo_coverage(text)))
    return items


def _label_bbox_sources(hazy_max_coverage: float) -> dict[str, list[Path]]:
    by_class: dict[str, list[Path]] = {"clear": [], "hazy": [], "heavy": []}
    for path, coverage in _pyronear_items() + _sainet_items():
        if coverage <= 0:
            by_class["clear"].append(path)
        elif coverage <= hazy_max_coverage:
            by_class["hazy"].append(path)
        else:
            by_class["heavy"].append(path)
    return by_class


def _compute_hazy_max_coverage() -> float:
    """Median of pooled nonzero coverage across both real-bbox sources --
    an even hazy/heavy split of the images that actually have smoke,
    computed from the data rather than an arbitrary constant."""
    coverages = [c for _, c in _pyronear_items() + _sainet_items() if c > 0]
    if not coverages:
        return 0.01
    median = statistics.median(coverages)
    print(f"Pooled nonzero bbox coverage: n={len(coverages)}, median={median:.5f} -> using as hazy/heavy split")
    return median


def _merge(*partials: dict[str, list[Path]]) -> dict[str, list[Path]]:
    merged: dict[str, list[Path]] = {"clear": [], "hazy": [], "heavy": []}
    for partial in partials:
        for label, paths in partial.items():
            merged[label].extend(paths)
    return merged


def _stratified_split(paths: list[Path], rng: random.Random) -> dict[str, list[Path]]:
    shuffled = paths[:]
    rng.shuffle(shuffled)
    n = len(shuffled)
    n_train = int(n * _SPLIT["train"])
    n_val = int(n * _SPLIT["val"])
    return {
        "train": shuffled[:n_train],
        "val": shuffled[n_train : n_train + n_val],
        "test": shuffled[n_train + n_val :],
    }


def main() -> None:
    rng = random.Random(_SEED)

    hpwren = _label_hpwren()
    print("HPWREN (Southern California):", {k: len(v) for k, v in hpwren.items()})

    hazy_max_coverage = _compute_hazy_max_coverage()
    bbox_sources = _label_bbox_sources(hazy_max_coverage)
    print("Pyronear + SAINet (France + Argentina):", {k: len(v) for k, v in bbox_sources.items()})

    by_class = _merge(hpwren, bbox_sources)
    print("Combined:", {k: len(v) for k, v in by_class.items()})

    if _OUT_DIR.exists():
        shutil.rmtree(_OUT_DIR)

    spot_check_lines = []
    for label, paths in by_class.items():
        splits = _stratified_split(paths, rng)
        for split_name, split_paths in splits.items():
            dest_dir = _OUT_DIR / split_name / label
            dest_dir.mkdir(parents=True, exist_ok=True)
            for src in split_paths:
                # Different sources can share a bare filename convention
                # (unlikely here given prefixes, but cheap insurance).
                dest_name = src.name if src.name not in {p.name for p in dest_dir.glob("*")} else f"{src.parent.name}_{src.name}"
                shutil.copy2(src, dest_dir / dest_name)

    all_labeled = [(label, p) for label, paths in by_class.items() for p in paths]
    rng.shuffle(all_labeled)
    for label, path in all_labeled[:_SPOT_CHECK_SAMPLE_SIZE]:
        spot_check_lines.append(f"{label}\t{path}")
    _SPOT_CHECK_FILE.write_text("\n".join(spot_check_lines))
    print(f"Wrote {len(spot_check_lines)}-image spot-check sample to {_SPOT_CHECK_FILE}")

    for split_name in _SPLIT:
        counts = {label: len(list((_OUT_DIR / split_name / label).glob("*.jpg"))) for label in by_class}
        print(f"{split_name}: {counts}")


if __name__ == "__main__":
    main()
