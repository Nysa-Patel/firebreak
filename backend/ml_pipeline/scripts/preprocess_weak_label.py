"""Turn the raw AI For Mankind classification dataset into a 3-class
(clear / hazy / heavy) train/val/test split.

Raw layout (from download_datasets.py):
  data/raw/classification/challenge1/no_smoke/*.jpg
  data/raw/classification/challenge1/smoke/*.jpg

Each filename is `{unix_timestamp}_{offset}.jpg`, where `offset` is seconds
relative to the labeled fire-detection onset for that camera sequence
(negative = before, positive = after; this is HPWREN/AI For Mankind's own
sequence convention, not something we invented). We use this as the weak
density signal:
  - no_smoke images                          -> clear
  - smoke images, offset <= HAZY_MAX_SECONDS  -> hazy   (smoke just starting)
  - smoke images, offset >  HAZY_MAX_SECONDS  -> heavy  (established plume)

This is a documented heuristic, not ground truth -- see ml_pipeline/README.md.
A random subset is written to spot_check_sample.txt for manual review.

Run from backend/: `python -m ml_pipeline.scripts.preprocess_weak_label`
"""

import random
import re
import shutil
from pathlib import Path

_RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "classification" / "challenge1"
_OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"
_SPOT_CHECK_FILE = Path(__file__).resolve().parent.parent / "spot_check_sample.txt"

_FILENAME_RE = re.compile(r"^\d+_([+-]\d+)\.jpg$")
_HAZY_MAX_SECONDS = 600  # smoke images within 10 min of onset -> hazy, else heavy

_SPLIT = {"train": 0.70, "val": 0.15, "test": 0.15}
_SEED = 42
_SPOT_CHECK_SAMPLE_SIZE = 150


def _offset_seconds(path: Path) -> int | None:
    match = _FILENAME_RE.match(path.name)
    return int(match.group(1)) if match else None


def _weak_label(path: Path, is_smoke: bool) -> str | None:
    if not is_smoke:
        return "clear"
    offset = _offset_seconds(path)
    if offset is None:
        return None
    return "heavy" if offset > _HAZY_MAX_SECONDS else "hazy"


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

    no_smoke_dir = _RAW_DIR / "no_smoke"
    smoke_dir = _RAW_DIR / "smoke"
    if not no_smoke_dir.exists() or not smoke_dir.exists():
        raise SystemExit(f"Expected {no_smoke_dir} and {smoke_dir} -- run download_datasets.py first.")

    by_class: dict[str, list[Path]] = {"clear": [], "hazy": [], "heavy": []}
    unlabeled = 0

    # The original archive was tarred on macOS, which sprinkles in AppleDouble
    # resource-fork companion files (`._foo.jpg`) alongside every real image --
    # these aren't valid images and must be excluded, not just "smoke images
    # that failed to parse" (an earlier version of this script only validated
    # filenames on the smoke/ side, silently dumping ~623 junk files into
    # `clear` from no_smoke/ before this was caught and fixed).
    def real_jpgs(dir_path: Path) -> list[Path]:
        return sorted(p for p in dir_path.glob("*.jpg") if not p.name.startswith("."))

    for path in real_jpgs(no_smoke_dir):
        label = _weak_label(path, is_smoke=False)
        by_class[label].append(path)

    for path in real_jpgs(smoke_dir):
        label = _weak_label(path, is_smoke=True)
        if label is None:
            unlabeled += 1
            continue
        by_class[label].append(path)

    print("Weak-label counts:", {k: len(v) for k, v in by_class.items()}, f"(skipped {unlabeled} unparseable filenames)")

    if _OUT_DIR.exists():
        shutil.rmtree(_OUT_DIR)

    spot_check_lines = []
    for label, paths in by_class.items():
        splits = _stratified_split(paths, rng)
        for split_name, split_paths in splits.items():
            dest_dir = _OUT_DIR / split_name / label
            dest_dir.mkdir(parents=True, exist_ok=True)
            for src in split_paths:
                shutil.copy2(src, dest_dir / src.name)

    # Spot-check sample for manual review (see ml_pipeline/README.md) --
    # written as `label\tpath` so a human can skim and flag disagreements.
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
