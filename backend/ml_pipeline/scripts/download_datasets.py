"""Download the real public dataset used to train the smoke-density classifier.

Source (see ml_pipeline/README.md for full attribution/license notes):
  AI For Mankind classification dataset (smoke / no-smoke, ~1,340 images),
  sourced from public-domain HPWREN wildfire camera imagery.
  https://github.com/aiformankind/wildfire-smoke-dataset
  CC BY-NC-SA 4.0 -- attribution to AI For Mankind + HPWREN required.

Despite the `.zip`-looking Google Drive filename, the file AI For Mankind
hosts is actually a gzip-compressed tarball -- this script detects that and
extracts it accordingly rather than assuming the extension is accurate.

Google Drive downloads require `gdown` (used only for this offline data prep
step; not a runtime dependency of the deployed API). Run from backend/:
`python -m ml_pipeline.scripts.download_datasets`.
"""

import tarfile
from pathlib import Path

import gdown

_RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
_ARCHIVE_PATH = _RAW_DIR / "classification_archive"
_EXTRACT_DIR = _RAW_DIR / "classification"
_SOURCE_URL = "https://drive.google.com/file/d/1aYoCF64DkC9jC7T6H5UTaxwCXrosy4io/view?usp=sharing"


def main() -> None:
    _RAW_DIR.mkdir(parents=True, exist_ok=True)

    if not _ARCHIVE_PATH.exists():
        print(f"Downloading classification dataset from {_SOURCE_URL} ...")
        gdown.download(url=_SOURCE_URL, output=str(_ARCHIVE_PATH), quiet=False)
    else:
        print(f"{_ARCHIVE_PATH} already downloaded, skipping download.")

    if (_EXTRACT_DIR / "challenge1").exists():
        print(f"{_EXTRACT_DIR} already extracted, skipping.")
        return

    print(f"Extracting {_ARCHIVE_PATH} -> {_EXTRACT_DIR} ...")
    _EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
    with tarfile.open(_ARCHIVE_PATH, mode="r:gz") as tar:
        # Only pull the top-level smoke/no_smoke folders -- `reference/` is a
        # duplicate curated subset for a separate benchmark challenge we
        # don't need, and skipping it roughly halves disk/extraction cost.
        members = [m for m in tar.getmembers() if not m.name.startswith("challenge1/reference/")]
        tar.extractall(path=_EXTRACT_DIR, members=members, filter="data")
    print("Done.")


if __name__ == "__main__":
    main()
