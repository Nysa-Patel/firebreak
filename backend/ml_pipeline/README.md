# Smoke Density Classifier -- Data & Model Documentation

## Problem framing

The original spec called for a 4-class density scale (clear / light haze /
moderate / heavy). We collapsed this to **3 classes (clear / hazy / heavy)**
because none of the source datasets are annotated for smoke *density*
directly -- they're annotated for smoke *detection* (smoke vs. no-smoke, or
bounding boxes). Building a defensible 3-class weak-labeling pipeline was
judged more honest than forcing a 4th class with no real signal behind it.

## Data sources

The first version of this model trained on a single Southern California
camera network (HPWREN), which meant it had never seen wildfire smoke
against a different sky, vegetation, or camera style. This version adds two
more sources, chosen specifically for geographic diversity rather than
volume:

| Dataset | Region | Images used | Label signal | License |
|---|---|---|---|---|
| [AI For Mankind classification dataset](https://github.com/aiformankind/wildfire-smoke-dataset) | Southern California, USA (HPWREN cameras) | 1,340 | Timestamp-offset-from-onset (weak heuristic -- see below) | CC BY-NC-SA 4.0 |
| [Pyronear (pyro-sdis)](https://huggingface.co/datasets/pyronear/pyro-sdis) | France (Force 06, SDIS 07/12/77 fire-service camera network) | 6,500 (subsampled from 33,636) | **Real YOLO bounding boxes** -> smoke-coverage-area | Apache-2.0 |
| [SAINet](https://huggingface.co/datasets/SAINetset/SAINetset_v8.0) | Cordoba, Argentina (SAI surveillance nodes, AlterMundi) | 5,551 (full dataset) | **Real YOLO bounding boxes** -> smoke-coverage-area | CC BY 4.0 |

**13,391 images total** (up from 1,340), spanning three continents. This is
still not "works everywhere" -- there's no Australian, Mediterranean-Europe,
or Southeast-Asian wildfire imagery here, and all three sources are
fixed-position lookout/surveillance cameras, not handheld phone photos like
the app's own crowd-submission feature produces. It's a meaningfully broader
sample than one region, not a claim of global coverage -- see "Known bias"
below for what's still missing.

**Attribution required by license:** AI For Mankind and HPWREN (CC
BY-NC-SA 4.0); Pyronear / SDIS 06, 07, 12, 77 (Apache 2.0); SAINet /
AlterMundi (CC BY 4.0). Because one of the three sources is
non-commercial-only, **the combined trained model is restricted to
non-commercial use** (competition/research) regardless of the other two
sources' more permissive terms -- noted in the presentation, since it affects
any claim about production/commercial readiness.

## Weak-labeling methodology (documented, not oversold)

Two different labeling signals are used, because only two of the three
sources ship real bounding boxes:

**Pyronear + SAINet (real bounding boxes):** each image's YOLO label file
gives actual smoke box coordinates. Coverage = sum of box areas / image area
(`scripts/bbox_utils.py`). No boxes -> `clear`. The hazy/heavy split point
is the **median of the pooled nonzero coverage values across both sources**,
computed at preprocessing time (not a hardcoded guess) -- currently ~0.0016
(0.16% of frame), which makes sense for early-detection fire-lookout cameras
built to catch a thin, distant wisp of smoke as early as possible, not a
frame-filling plume. This is a genuine density signal, not a heuristic.

**HPWREN / AI For Mankind (no bounding boxes available):** filenames encode
`{unix_timestamp}_{offset_seconds}.jpg`, where `offset_seconds` is time
relative to that camera sequence's fire-detection onset. `no_smoke/` ->
`clear`; `smoke/` with `offset_seconds <= 600` -> `hazy`; `>600` -> `heavy`.
This remains a **weaker proxy** than bbox coverage -- time-since-onset
correlates with plume buildup but isn't guaranteed (wind disperses smoke as
often as it accumulates it) -- which is exactly why the two newer sources use
the stronger bbox-based signal instead. A random 150-image sample spanning
all three sources is written to `spot_check_sample.txt` for manual review;
disagreements found there are noted in `eval_report.md`.

See `scripts/preprocess_weak_label.py` for the full merge logic, and
`scripts/extract_pyronear.py` for how the Pyronear subsample was pulled out
of the upstream Hugging Face dataset (it ships as parquet, not individual
files, and 33,636 images was more than a season-1 training budget needed --
SAINet, at 5,551, was small enough to use in full).

## Known bias

Better than the single-region baseline, but still not global:
- All three sources are **fixed-position lookout/surveillance cameras**, not
  handheld photos -- the app's own crowd-submission feature (arbitrary phone
  cameras, arbitrary angles) is a meaningfully different distribution the
  model has never trained on.
- Geographic coverage is North America (SoCal) + Western Europe (France) +
  South America (Argentina) -- no Australia, Mediterranean Europe, Southeast
  Asia, or sub-Saharan Africa, all real wildfire regions.
- Pyronear's cameras are tuned for *early detection* (thin, distant smoke),
  which is why its coverage values skew small -- the model may be
  under-exposed to close-range, frame-filling smoke relative to how a phone
  photo taken by someone standing near a fire would look.

Flagged explicitly in the app UI copy and the ethics section of the
presentation, not just in this doc.

## False negatives

A missed "heavy" classified as "clear" is the worst-case failure mode here --
someone with asthma could be falsely reassured. Mitigations:
- The personal risk engine (`app/services/risk_engine.py`) always takes the
  **more severe** of the CV reading and the official AQI reading, so a single
  wrong photo can't override a worse official signal.
- UI copy avoids absolute language ("no smoke detected" rather than "safe"),
  and includes a standing disclaimer that this is not a medical device.

## Pipeline

`download_datasets.py` (HPWREN) + `extract_pyronear.py` (Pyronear, requires
`pip install datasets` from `requirements-training.txt`) + a direct
`huggingface_hub.snapshot_download` for SAINet -> `preprocess_weak_label.py`
(merges all three) -> `train.py` -> `evaluate.py` -> `export_onnx.py`. See
each script's docstring. Run all from `backend/`, e.g.
`python -m ml_pipeline.scripts.download_datasets`.
