import base64
import io

import imagehash
from PIL import Image


def compute_phash_bytes(raw: bytes) -> str:
    image = Image.open(io.BytesIO(raw)).convert("RGB")
    return str(imagehash.phash(image))


def compute_phash(image_base64: str) -> str:
    return compute_phash_bytes(base64.b64decode(image_base64))


def hamming_distance(hash_a: str, hash_b: str) -> int:
    return imagehash.hex_to_hash(hash_a) - imagehash.hex_to_hash(hash_b)


def is_near_duplicate(hash_a: str, hash_b: str, threshold: int = 6) -> bool:
    """phash is 64 bits; a Hamming distance under ~6 in practice means the
    same or a trivially re-encoded/re-cropped photo, not just 'similar sky'."""
    return hamming_distance(hash_a, hash_b) <= threshold
