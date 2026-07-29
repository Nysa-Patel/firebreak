# Smoke Density Classifier -- Data & Model Documentation

## Problem framing

The original spec called for a 4-class density scale (clear / light haze /
moderate / heavy). We collapsed this to **3 classes (clear / hazy / heavy)**
because the source datasets are annotated for smoke *detection*
(smoke vs. no-smoke, or bounding boxes), not density grading -- there is no
existing 4-way density label to train against. Building a defensible 3-class
weak-labeling pipeline was judged more honest than forcing a 4th class with
no real signal behind it.

## Data sources

| Dataset | Use | License |
|---|---|---|
| [AI For Mankind classification dataset](https://github.com/aiformankind/wildfire-smoke-dataset) (smoke / no-smoke, ~1,340 images) | Primary and only source -- no-smoke images become `clear`, smoke images are further split into `hazy`/`heavy` (see below) | CC BY-NC-SA 4.0 |

Traces back to public-domain **HPWREN** wildfire camera imagery, annotated by
AI For Mankind and volunteers. **Attribution to AI For Mankind and HPWREN is
required and included in the app's About/credits page and this repo.** The
CC BY-NC-SA license means this specific trained model is for non-commercial
(competition/research) use -- noted explicitly in the presentation, since it
affects any claim about production/commercial readiness.

(The bounding-box and cloud/fog datasets from the same project were
considered for a coverage-area-based density signal, but were dropped to keep
the pipeline shippable in the time available -- see the timestamp-offset
method below instead.)

## Weak-labeling methodology (documented, not oversold)

Each image's filename encodes `{unix_timestamp}_{offset_seconds}.jpg`, where
`offset_seconds` is AI For Mankind's own label for time relative to that
camera sequence's fire-detection onset (negative = before, positive = after).
We reuse this existing metadata as a density proxy instead of inventing a new
signal:

1. `no_smoke/` images -> `clear`.
2. `smoke/` images with `offset_seconds <= 600` (within 10 minutes of onset,
   smoke just starting) -> `hazy`.
3. `smoke/` images with `offset_seconds > 600` (established plume) -> `heavy`.

See `scripts/preprocess_weak_label.py`. This is a **weak-labeling
heuristic** riding on the dataset's own sequence metadata, not an
expert-annotated density grade -- time-since-onset correlates with plume
buildup but isn't a guaranteed proxy (wind can disperse smoke just as easily
as accumulate it). A random 150-image sample is written to
`spot_check_sample.txt` for manual spot-checking; disagreements found there
are noted in `eval_report.md` alongside the model metrics, so judges see how
noisy the label source is, not just how well the model fits it.

## Known bias

HPWREN cameras are concentrated in **Southern California**; the model is
therefore trained almost entirely on one region's smoke/terrain/lighting
conditions. Performance on wildfire smoke in other geographies (Pacific
Northwest, the app's own Chico/Butte County demo region, let alone
non-US wildfire contexts) is untested and likely to degrade -- flagged
explicitly in the app UI copy and the ethics section of the presentation,
not just in this doc.

## False negatives

A missed "heavy" classified as "clear" is the worst-case failure mode here --
someone with asthma could be falsely reassured. Mitigations:
- The personal risk engine (`app/services/risk_engine.py`) always takes the
  **more severe** of the CV reading and the official AQI reading, so a single
  wrong photo can't override a worse official signal.
- UI copy avoids absolute language ("no smoke detected" rather than "safe"),
  and includes a standing disclaimer that this is not a medical device.

## Pipeline

`download_datasets.py` -> `preprocess_weak_label.py` -> `train.py` ->
`evaluate.py` -> `export_onnx.py`. See each script's docstring. Run all from
`backend/`, e.g. `python -m ml_pipeline.scripts.download_datasets`.
