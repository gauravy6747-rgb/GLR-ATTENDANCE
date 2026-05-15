import base64
import os
from datetime import datetime
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
FACE_DATA_DIR = Path(os.getenv("FACE_DATA_DIR", BACKEND_ROOT / "face_data")).resolve()


class FaceStorageError(Exception):
    pass


def _decode_image(image_data: str):
    if not image_data:
        raise FaceStorageError("Face photo is required.")

    if image_data.startswith("data:"):
        _, encoded = image_data.split(",", 1)
    else:
        encoded = image_data

    try:
        return base64.b64decode(encoded)
    except Exception as exc:
        raise FaceStorageError("Invalid face photo data.") from exc


def save_enrolled_face(image_data: str, user_id):
    image_bytes = _decode_image(image_data)
    directory = FACE_DATA_DIR / "enrolled"
    directory.mkdir(parents=True, exist_ok=True)

    path = directory / f"{user_id}.jpg"
    path.write_bytes(image_bytes)

    return str(path)


def save_attendance_face(image_data: str, user_id, action_type: str):
    image_bytes = _decode_image(image_data)
    directory = FACE_DATA_DIR / "attendance" / str(user_id)
    directory.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    path = directory / f"{timestamp}_{action_type}.jpg"
    path.write_bytes(image_bytes)

    return str(path)


def get_face_path(relative_path: str):
    if not relative_path:
        raise FaceStorageError("No enrolled face image found.")

    path = Path(relative_path)
    if not path.is_absolute():
        path = BACKEND_ROOT / relative_path

    if not path.exists():
        raise FaceStorageError("Enrolled face image file is missing. Please enroll again.")

    return str(path)
