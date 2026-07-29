"""Fine-tune MobileNetV2 for 3-class smoke density classification
(clear / hazy / heavy).

Expects ml_pipeline/data/processed/{train,val,test}/{clear,hazy,heavy}/*.jpg
(produced by scripts/preprocess_weak_label.py).

MobileNetV2 is chosen over a larger backbone because: (a) it needs to run
cheaply via onnxruntime on a small Render instance with no GPU, (b) transfer
learning on a dataset in the low thousands of images doesn't benefit much
from a bigger backbone and risks overfitting faster, (c) it's the same
model family a real deployed mobile/edge smoke-camera product would use.

Run from backend/: `python -m ml_pipeline.train`
"""

from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

_DATA_DIR = Path(__file__).resolve().parent / "data" / "processed"
_MODEL_OUT = Path(__file__).resolve().parent / "model"
_CLASSES = ["clear", "hazy", "heavy"]
_INPUT_SIZE = 224
_BATCH_SIZE = 32
_EPOCHS_FROZEN = 5  # train just the new head
_EPOCHS_FINE_TUNE = 5  # unfreeze last block and continue at a lower LR

_NORMALIZE = transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])  # matches [-1, 1] MobileNetV2 preprocessing

_train_transform = transforms.Compose(
    [
        transforms.Resize((_INPUT_SIZE, _INPUT_SIZE)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        _NORMALIZE,
    ]
)
_eval_transform = transforms.Compose(
    [
        transforms.Resize((_INPUT_SIZE, _INPUT_SIZE)),
        transforms.ToTensor(),
        _NORMALIZE,
    ]
)


def _build_model() -> nn.Module:
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    for param in model.features.parameters():
        param.requires_grad = False
    model.classifier[1] = nn.Linear(model.last_channel, len(_CLASSES))
    return model


def _unfreeze_last_block(model: nn.Module) -> None:
    # MobileNetV2's `features` is a flat Sequential of InvertedResidual
    # blocks; unfreeze just the last couple for fine-tuning.
    for param in model.features[-3:].parameters():
        param.requires_grad = True


def _select_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def train() -> Path:
    device = _select_device()
    print(f"Training on device: {device}")

    train_ds = datasets.ImageFolder(_DATA_DIR / "train", transform=_train_transform)
    val_ds = datasets.ImageFolder(_DATA_DIR / "val", transform=_eval_transform)
    assert train_ds.classes == _CLASSES, f"Expected classes {_CLASSES}, found {train_ds.classes}"

    train_loader = DataLoader(train_ds, batch_size=_BATCH_SIZE, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=_BATCH_SIZE, shuffle=False, num_workers=2)

    model = _build_model().to(device)

    # The weak-labeling scheme (see ml_pipeline/README.md) produces an
    # imbalanced train set (hazy is ~3x rarer than clear/heavy) since it's
    # derived from real time-since-onset distribution, not chosen for
    # balance -- inverse-frequency class weights keep the minority class
    # from being ignored rather than rebalancing the data itself.
    class_counts = torch.bincount(torch.tensor(train_ds.targets), minlength=len(_CLASSES)).float()
    class_weights = (class_counts.sum() / (len(_CLASSES) * class_counts)).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    def run_epoch(optimizer=None):
        is_train = optimizer is not None
        model.train(is_train)
        loader = train_loader if is_train else val_loader
        total_loss, correct, total = 0.0, 0, 0
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            if is_train:
                optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            if is_train:
                loss.backward()
                optimizer.step()
            total_loss += loss.item() * images.size(0)
            correct += (outputs.argmax(1) == labels).sum().item()
            total += images.size(0)
        return total_loss / total, correct / total

    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3)
    for epoch in range(_EPOCHS_FROZEN):
        train_loss, train_acc = run_epoch(optimizer)
        val_loss, val_acc = run_epoch()
        print(f"[frozen {epoch+1}/{_EPOCHS_FROZEN}] train_acc={train_acc:.3f} val_acc={val_acc:.3f}")

    _unfreeze_last_block(model)
    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-4)
    for epoch in range(_EPOCHS_FINE_TUNE):
        train_loss, train_acc = run_epoch(optimizer)
        val_loss, val_acc = run_epoch()
        print(f"[fine-tune {epoch+1}/{_EPOCHS_FINE_TUNE}] train_acc={train_acc:.3f} val_acc={val_acc:.3f}")

    _MODEL_OUT.mkdir(parents=True, exist_ok=True)
    checkpoint_path = _MODEL_OUT / "smoke_density.pt"
    torch.save(model.state_dict(), checkpoint_path)
    print(f"Saved checkpoint to {checkpoint_path}")
    return checkpoint_path


if __name__ == "__main__":
    train()
