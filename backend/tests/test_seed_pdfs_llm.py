"""Integration test for the Ollama call wrapper (Seam: app.seed.pdfs.llm.call_ollama).

Requires a local Ollama server running with the llama3.1:8b model pulled
(`brew services start ollama`, `ollama pull llama3.1:8b`) — same convention
as tests/test_seed.py requiring a real local Postgres.
"""

import json

from app.seed.pdfs.llm import call_ollama


def test_call_ollama_returns_valid_json_content():
    raw = call_ollama(
        prompt="Reply now.",
        system=(
            'Respond with ONLY a JSON object with exactly one key, "ok", '
            "mapping to the boolean true."
        ),
    )

    parsed = json.loads(raw)
    assert parsed == {"ok": True}
