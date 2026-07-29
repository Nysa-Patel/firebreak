"""Evaluate the trained checkpoint on the held-out test split and write a
markdown report with precision/recall/F1 per class and a confusion matrix --
the artifact needed for the competition's Data Handling & Evaluation
criterion.

Run from backend/: `python -m ml_pipeline.evaluate`
"""

from pathlib import Path

import torch
from sklearn.metrics import classification_report, confusion_matrix
from torch.utils.data import DataLoader
from torchvision import datasets

from ml_pipeline.train import _CLASSES, _MODEL_OUT, _build_model, _eval_transform, _DATA_DIR, _select_device

_REPORT_PATH = Path(__file__).resolve().parent / "eval_report.md"


def evaluate() -> None:
    device = _select_device()

    test_ds = datasets.ImageFolder(_DATA_DIR / "test", transform=_eval_transform)
    test_loader = DataLoader(test_ds, batch_size=32, shuffle=False)

    model = _build_model().to(device)
    model.load_state_dict(torch.load(_MODEL_OUT / "smoke_density.pt", map_location=device))
    model.eval()

    all_preds, all_labels = [], []
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            all_preds.extend(outputs.argmax(1).cpu().tolist())
            all_labels.extend(labels.tolist())

    report = classification_report(all_labels, all_preds, target_names=_CLASSES, digits=3)
    cm = confusion_matrix(all_labels, all_preds)

    cm_table = "| actual \\ predicted | " + " | ".join(_CLASSES) + " |\n"
    cm_table += "|---" * (len(_CLASSES) + 1) + "|\n"
    for i, row in enumerate(cm):
        cm_table += f"| **{_CLASSES[i]}** | " + " | ".join(str(v) for v in row) + " |\n"

    markdown = f"""# Smoke Density Classifier -- Evaluation Report

Test set size: {len(test_ds)} images (70/15/15 train/val/test split).

## Classification Report

```
{report}
```

## Confusion Matrix

{cm_table}

## Notes

- Classes: {_CLASSES} (collapsed from an original 4-class plan to 3 -- see
  ml_pipeline/README.md for why).
- Labels are weak/derived (see scripts/preprocess_weak_label.py), not
  hand-labeled from scratch; a spot-checked subset's agreement rate is
  reported separately in README.md.
- Known bias: source imagery (HPWREN cameras) skews Southern California --
  see README.md Ethics section.
"""
    _REPORT_PATH.write_text(markdown)
    print(f"Wrote {_REPORT_PATH}")
    print(report)


if __name__ == "__main__":
    evaluate()
