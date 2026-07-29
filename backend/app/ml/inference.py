"""Smoke-density inference.

Loads the ONNX-exported MobileNetV2 classifier trained in
ml_pipeline/scripts/train.py, if present. Until that model is trained and
exported (see ml_pipeline/README.md), classify_smoke() falls back to a
simple, clearly-labeled image-statistics heuristic so the endpoint is never
silently wrong about what produced its answer -- model_source in the response
always says which path was used.
"""

import base64
import io
from pathlib import Path

import numpy as np
from PIL import Image

from app.models.schemas import ClassifySmokeResponse

_LABELS = ["clear", "hazy", "heavy"]
_MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "ml_pipeline" / "model" / "smoke_density.onnx"
_INPUT_SIZE = 224

_session = None
if _MODEL_PATH.exists():
    import onnxruntime as ort

    _session = ort.InferenceSession(str(_MODEL_PATH))


def _preprocess(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB").resize((_INPUT_SIZE, _INPUT_SIZE))
    array = np.asarray(image, dtype=np.float32) / 127.5 - 1.0  # MobileNetV2 preprocessing
    array = np.transpose(array, (2, 0, 1))  # HWC -> CHW
    return np.expand_dims(array, axis=0)


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
    logits = _session.run(None, {input_name: input_array})[0][0]
    probs = np.exp(logits) / np.sum(np.exp(logits))
    idx = int(np.argmax(probs))

    return ClassifySmokeResponse(
        density_class=_LABELS[idx],
        confidence=float(probs[idx]),
        model_source="onnx_model",
    )


def classify_smoke_base64(image_base64: str) -> ClassifySmokeResponse:
    return classify_smoke_bytes(base64.b64decode(image_base64))


def model_is_trained() -> bool:
    return _session is not None
