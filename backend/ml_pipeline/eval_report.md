# Smoke Density Classifier -- Evaluation Report

Test set size: 204 images (70/15/15 train/val/test split).

## Classification Report

```
              precision    recall  f1-score   support

       clear      0.903     0.691     0.783        94
        hazy      0.385     0.833     0.526        30
       heavy      0.985     0.825     0.898        80

    accuracy                          0.765       204
   macro avg      0.757     0.783     0.736       204
weighted avg      0.859     0.765     0.790       204

```

## Confusion Matrix

| actual \ predicted | clear | hazy | heavy |
|---|---|---|---|
| **clear** | 65 | 29 | 0 |
| **hazy** | 4 | 25 | 1 |
| **heavy** | 3 | 11 | 66 |


## Notes

- Classes: ['clear', 'hazy', 'heavy'] (collapsed from an original 4-class plan to 3 -- see
  ml_pipeline/README.md for why).
- Labels are weak/derived (see scripts/preprocess_weak_label.py), not
  hand-labeled from scratch. `hazy` precision (0.385) is noticeably worse than
  `clear`/`heavy` -- the confusion matrix shows this is mostly `clear` and
  `heavy` images the model calls `hazy`, not confusion between `clear` and
  `heavy` directly (0 clear images were ever predicted `heavy`). That pattern
  matches what a manual spot-check of a handful of raw `heavy`-labeled images
  found: some are dominated by a large nearby smoke plume (clear match), but
  others show only a thin, distant plume on the horizon with an otherwise
  blue sky -- i.e. the offset-based weak label sometimes overstates density
  for shots taken far from the fire itself. This is a real limitation of the
  timestamp-offset heuristic, not the model.
- Safety-relevant direction: 3 of 80 `heavy` test images (3.75%) were
  misclassified as `clear` -- the false-negative failure mode called out in
  README.md. This is why the personal risk engine takes the *more severe* of
  the CV reading and the official AQI reading rather than trusting the photo
  alone.
- Known bias: source imagery (HPWREN cameras) skews Southern California --
  see README.md Ethics section.
