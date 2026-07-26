import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def save_event_photo(file: UploadFile) -> str:
    """Validates and writes an uploaded image to disk, returns the stored filename."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG or WEBP images are allowed",
        )

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds the 5MB size limit",
        )

    extension = ALLOWED_CONTENT_TYPES[file.content_type]
    # Random filename: avoids collisions and avoids trusting the client's
    # original filename (path traversal, weird characters, duplicates).
    filename = f"{uuid.uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(contents)
    return filename


def delete_event_photo_file(filename: str) -> None:
    path = UPLOAD_DIR / filename
    if path.exists():
        path.unlink()
