"""Export the trained PyTorch checkpoint to ONNX for serving via onnxruntime
inside the FastAPI process (see app/ml/inference.py).

Run from backend/: `python -m ml_pipeline.export_onnx`
"""

from pathlib import Path

import torch

from ml_pipeline.train import _MODEL_OUT, _build_model, _INPUT_SIZE

_ONNX_PATH = _MODEL_OUT / "smoke_density.onnx"


def export() -> Path:
    model = _build_model()
    model.load_state_dict(torch.load(_MODEL_OUT / "smoke_density.pt", map_location="cpu"))
    model.eval()

    dummy_input = torch.randn(1, 3, _INPUT_SIZE, _INPUT_SIZE)
    torch.onnx.export(
        model,
        dummy_input,
        str(_ONNX_PATH),
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=18,  # torch's exporter targets 18+ regardless; asking for 17 just triggers a failed downgrade attempt
    )
    print(f"Exported ONNX model to {_ONNX_PATH}")
    return _ONNX_PATH


if __name__ == "__main__":
    export()
