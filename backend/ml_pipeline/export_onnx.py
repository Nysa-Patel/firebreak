"""Export the trained PyTorch checkpoint to ONNX for serving via onnxruntime
inside the FastAPI process (see app/ml/inference.py).

Exports a wrapper that returns both the classification logits AND the final
conv feature map (pre-global-average-pool). Because this head is a plain
GAP -> single Linear layer (see train.py's _build_model), that feature map is
exactly what's needed for Class Activation Mapping (Zhou et al. 2016): CAM
for class c is a weighted sum of the feature map's channels, weighted by that
class's row in the Linear layer -- no gradients, no torch, and no separate
explainability model required at inference time. The Linear layer's
weight/bias are dumped alongside the ONNX file as a small .npz so
app/ml/inference.py can do that weighted sum with plain numpy.

Run from backend/: `python -m ml_pipeline.export_onnx`
"""

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

from ml_pipeline.train import _MODEL_OUT, _build_model, _INPUT_SIZE

_ONNX_PATH = _MODEL_OUT / "smoke_density.onnx"
_HEAD_WEIGHTS_PATH = _MODEL_OUT / "smoke_density_head.npz"


class _CamExportWrapper(nn.Module):
    """Splits MobileNetV2's forward pass so the pre-pool feature map is a
    real output, not an intermediate value discarded after the forward pass."""

    def __init__(self, model: nn.Module):
        super().__init__()
        self.features = model.features
        self.classifier = model.classifier

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        feature_map = self.features(x)  # [B, 1280, 7, 7] for 224x224 input
        pooled = nn.functional.adaptive_avg_pool2d(feature_map, 1).flatten(1)
        logits = self.classifier(pooled)
        return logits, feature_map


def export() -> Path:
    model = _build_model()
    model.load_state_dict(torch.load(_MODEL_OUT / "smoke_density.pt", map_location="cpu"))
    model.eval()

    wrapper = _CamExportWrapper(model)
    wrapper.eval()

    dummy_input = torch.randn(1, 3, _INPUT_SIZE, _INPUT_SIZE)
    torch.onnx.export(
        wrapper,
        dummy_input,
        str(_ONNX_PATH),
        input_names=["input"],
        output_names=["logits", "feature_map"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}, "feature_map": {0: "batch"}},
        opset_version=18,  # torch's exporter targets 18+ regardless; asking for 17 just triggers a failed downgrade attempt
    )
    print(f"Exported ONNX model to {_ONNX_PATH}")

    # classifier is Sequential(Dropout, Linear) -- index 1 is the Linear head.
    linear = model.classifier[1]
    np.savez(
        _HEAD_WEIGHTS_PATH,
        weight=linear.weight.detach().numpy(),  # [num_classes, 1280]
        bias=linear.bias.detach().numpy(),  # [num_classes]
    )
    print(f"Saved classifier head weights to {_HEAD_WEIGHTS_PATH}")
    return _ONNX_PATH


if __name__ == "__main__":
    export()
