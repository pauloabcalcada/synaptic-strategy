"""JSON-file-backed cache for LLM-generated PDF content, keyed by a hash of
the exact grounding facts passed in — so any change to the underlying data
naturally produces a cache miss, with no manual invalidation needed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


def cache_key(context: dict) -> str:
    canonical = json.dumps(context, sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class LlmCache:
    def __init__(self, path: Path):
        self.path = Path(path)
        if self.path.exists():
            self._data: dict[str, dict] = json.loads(self.path.read_text())
        else:
            self._data = {}

    def get(self, key: str) -> dict | None:
        return self._data.get(key)

    def set(self, key: str, value: dict) -> None:
        self._data[key] = value

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._data, indent=2, sort_keys=True))
