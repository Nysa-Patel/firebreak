# Smoke Density Classifier -- Evaluation Report

Test set size: 2011 images (70/15/15 train/val/test split).
Trained on three geographically distinct sources -- HPWREN (Southern
California), Pyronear (France), and SAINet (Argentina) -- see
ml_pipeline/README.md for the full breakdown and licensing.

## Classification Report

```
              precision    recall  f1-score   support

       clear      0.978     0.857     0.914      1055
        hazy      0.615     0.684     0.648       453
       heavy      0.659     0.763     0.707       503

    accuracy                          0.795      2011
   macro avg      0.751     0.768     0.756      2011
weighted avg      0.817     0.795     0.802      2011

```

## Confusion Matrix

| actual \ predicted | clear | hazy | heavy |
|---|---|---|---|
| **clear** | 904 | 85 | 66 |
| **hazy** | 10 | 310 | 133 |
| **heavy** | 10 | 109 | 384 |


## Notes

- Classes: ['clear', 'hazy', 'heavy'] (collapsed from an original 4-class plan to 3 -- see
  ml_pipeline/README.md for why).
- Labels are weak/derived (see scripts/preprocess_weak_label.py): real
  bounding-box coverage for Pyronear/SAINet, a timestamp-offset heuristic for
  HPWREN (no boxes available for that source). A spot-checked subset's
  agreement rate is reported separately in README.md.
- Safety-relevant direction: 10 of 503 `heavy`
  test images (2.0%) were misclassified as `clear` --
  the false-negative failure mode called out in README.md, where someone
  could be falsely reassured. This is why the personal risk engine takes the
  more severe of the CV reading and the official AQI reading rather than
  trusting the photo alone.
- Known bias: all three sources are fixed-position lookout/surveillance
  cameras from three specific countries, not a global or handheld-photo
  sample -- see README.md "Known bias" for what's still missing.
