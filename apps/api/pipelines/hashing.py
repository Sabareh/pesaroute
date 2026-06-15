from __future__ import annotations

import hashlib
import json


def content_hash(value: bytes | str | dict | list) -> str:
    if isinstance(value, bytes):
        payload = value
    elif isinstance(value, str):
        payload = value.encode("utf-8")
    else:
        payload = json.dumps(value, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
