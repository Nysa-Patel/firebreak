"""Smoke-density inference.

Loads the ONNX-exported MobileNetV2 classifier trained in
ml_pipeline/scripts/train.py, if present. Until that model is trained and
exported (see ml_pipeline/README.md), classify_smoke() falls back to a
simple, clearly-labeled image-statistics heuristic so the endpoint is never
silently wrong about what produced its answer -- model_source in the response
always says which path was used.

The ONNX export (ml_pipeline/export_onnx.py) also emits the pre-pool feature
map as a second output. Because the trained head is a plain global-average-
pool followed by a single Linear layer, that feature map is enough to compute
a real Class Activation Map (Zhou et al. 2016) for the predicted class --
no gradients and no separate explainability model needed, just a weighted
sum of feature-map channels using that class's row of the Linear layer's
weight matrix (loaded from the small .npz dumped alongside the ONNX file).
"""

import base64
import io
from pathlib import Path

import numpy as np
from PIL import Image

from app.models.schemas import ClassifySmokeResponse

_LABELS = ["clear", "hazy", "heavy"]
_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "ml_pipeline" / "model"
_MODEL_PATH = _MODEL_DIR / "smoke_density.onnx"
_HEAD_WEIGHTS_PATH = _MODEL_DIR / "smoke_density_head.npz"
_INPUT_SIZE = 224

_EXPLANATION = {
    "clear": "Highlighted regions influenced the 'clear' call most -- consistent sky "
    "color and contrast throughout, with no localized haze the model weighted heavily.",
    "hazy": "Highlighted regions show where the model found the color desaturation and "
    "contrast loss typical of light smoke haze.",
    "heavy": "Highlighted regions show where the model found the strong desaturation "
    "and flattened contrast typical of heavy smoke.",
}

# Grad-CAM-style colormap control points (low -> high activation), each an
# (R, G, B) tuple -- linearly interpolated between. Alpha scales with
# activation too, so low-activation areas stay nearly transparent.
_COLORMAP_STOPS = [
    (0.0, (0, 0, 255)),
    (0.33, (0, 255, 255)),
    (0.66, (255, 255, 0)),
    (1.0, (255, 0, 0)),
]
_MAX_OVERLAY_ALPHA = 165

_session = None
_head_weight = None
_head_bias = None
if _MODEL_PATH.exists() and _HEAD_WEIGHTS_PATH.exists():
    import onnxruntime as ort

    _session = ort.InferenceSession(str(_MODEL_PATH))
    _head = np.load(_HEAD_WEIGHTS_PATH)
    _head_weight = _head["weight"]  # [num_classes, 1280]
    _head_bias = _head["bias"]  # [num_classes]


def _preprocess(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB").resize((_INPUT_SIZE, _INPUT_SIZE))
    array = np.asarray(image, dtype=np.float32) / 127.5 - 1.0  # MobileNetV2 preprocessing
    array = np.transpose(array, (2, 0, 1))  # HWC -> CHW
    return np.expand_dims(array, axis=0)


def _colormap(intensity: np.ndarray) -> np.ndarray:
    """Maps a [H, W] array of 0..1 activations to an [H, W, 4] RGBA uint8 array."""
    h, w = intensity.shape
    rgb = np.zeros((h, w, 3), dtype=np.float32)
    for (lo, lo_color), (hi, hi_color) in zip(_COLORMAP_STOPS, _COLORMAP_STOPS[1:]):
        mask = (intensity >= lo) & (intensity <= hi)
        span = hi - lo or 1.0
        t = np.clip((intensity[mask] - lo) / span, 0, 1)
        for c in range(3):
            rgb[mask, c] = lo_color[c] + t * (hi_color[c] - lo_color[c])

    alpha = (intensity * _MAX_OVERLAY_ALPHA).astype(np.uint8)
    return np.dstack([rgb.astype(np.uint8), alpha])


def _compute_cam_overlay(feature_map: np.ndarray, class_idx: int, base_image: Image.Image) -> str:
    """feature_map: [1280, 7, 7] for the predicted class. Returns a base64 PNG
    of base_image (resized to model input size) with the CAM heatmap alpha-blended on top."""
    weights = _head_weight[class_idx]  # [1280]
    cam = np.tensordot(weights, feature_map, axes=([0], [0]))  # [7, 7]
    cam = np.maximum(cam, 0)  # ReLU -- only positive evidence for this class
    peak = cam.max()
    cam = cam / peak if peak > 0 else cam

    cam_img = Image.fromarray((cam * 255).astype(np.uint8)).resize(
        (_INPUT_SIZE, _INPUT_SIZE), Image.BILINEAR
    )
    cam_upsampled = np.asarray(cam_img, dtype=np.float32) / 255.0

    overlay = Image.fromarray(_colormap(cam_upsampled), mode="RGBA")
    base = base_image.convert("RGB").resize((_INPUT_SIZE, _INPUT_SIZE)).convert("RGBA")
    combined = Image.alpha_composite(base, overlay)

    buffer = io.BytesIO()
    combined.convert("RGB").save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _heuristic_fallback(image: Image.Image) -> ClassifySmokeResponse:
    """Naive placeholder used only when no trained model is present: smoke
    tends to desaturate and flatten contrast in a sky photo. This is NOT the
    CV model -- it exists so the API contract works end-to-end before
    training finishes, and is always reported as such via model_source."""
    hsv = np.asarray(image.convert("HSV"), dtype=np.float32)
    mean_saturation = hsv[:, :, 1].mean() / 255.0
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    # Raw pixel std rarely exceeds ~50 even in high-contrast natural photos,
    # so normalize against that instead of the theoretical 0-255 range --
    # dividing by 255 made this term saturate near 1 for almost every image
    # and drown out the (more discriminating) saturation signal.
    contrast = min(gray.std() / 50.0, 1.0)

    haze_score = (1 - mean_saturation) * 0.7 + (1 - contrast) * 0.3
    if haze_score < 0.45:
        density_class = "clear"
    elif haze_score < 0.65:
        density_class = "hazy"
    else:
        density_class = "heavy"

    return ClassifySmokeResponse(density_class=density_class, confidence=0.4, model_source="unavailable_stub")


def classify_smoke_bytes(raw: bytes) -> ClassifySmokeResponse:
    image = Image.open(io.BytesIO(raw))

    if _session is None:
        return _heuristic_fallback(image)

    input_array = _preprocess(image)
    input_name = _session.get_inputs()[0].name
    logits, feature_map = _session.run(["logits", "feature_map"], {input_name: input_array})
    logits = logits[0]
    feature_map = feature_map[0]  # [1280, 7, 7]

    probs = np.exp(logits) / np.sum(np.exp(logits))
    idx = int(np.argmax(probs))
    density_class = _LABELS[idx]

    heatmap_overlay_base64 = _compute_cam_overlay(feature_map, idx, image)

    return ClassifySmokeResponse(
        density_class=density_class,
        confidence=float(probs[idx]),
        model_source="onnx_model",
        heatmap_overlay_base64=heatmap_overlay_base64,
        explanation=_EXPLANATION[density_class],
    )


def classify_smoke_base64(image_base64: str) -> ClassifySmokeResponse:
    return classify_smoke_bytes(base64.b64decode(image_base64))


def model_is_trained() -> bool:
    return _session is not None
