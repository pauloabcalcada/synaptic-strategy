"""Thin wrapper over the local Ollama chat API."""

from __future__ import annotations

import ollama

DEFAULT_MODEL = "llama3.1:8b"


def call_ollama(prompt: str, system: str, model: str = DEFAULT_MODEL) -> str:
    response = ollama.chat(
        model=model,
        format="json",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    return response.message.content
