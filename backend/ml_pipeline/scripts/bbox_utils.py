"""Shared helper for sources that ship real YOLO-format bounding boxes
(Pyronear, SAINet) -- unlike HPWREN's timestamp-offset proxy, these give an
actual smoke-coverage-area signal, which is a stronger basis for the
clear/hazy/heavy weak label than a heuristic.
"""


def parse_yolo_coverage(annotation_text: str) -> float:
    """Sum of normalized bounding-box areas from YOLO-format lines
    (`class_id x_center y_center width height`, all 0-1). Boxes are assumed
    non-overlapping for this purpose -- a coarse density proxy, not exact
    pixel coverage. Empty/whitespace-only text (no boxes) -> 0.0."""
    total = 0.0
    for line in annotation_text.strip().splitlines():
        parts = line.split()
        if len(parts) < 5:
            continue
        _, _, _, width, height = parts[:5]
        total += float(width) * float(height)
    return total
