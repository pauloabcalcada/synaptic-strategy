"""Builds LLM-generated meeting-minutes narrative, grounded in the exact
KPI facts for one area/period. Replaces the old rule-based narrative.py.
"""

from __future__ import annotations

import json

from app.seed.pdfs.llm import call_ollama
from app.seed.pdfs.llm_cache import LlmCache, cache_key

SYSTEM_PROMPT = (
    "You write realistic corporate meeting minutes for a fintech company "
    "called NovaPay. You are given the exact KPI results for one area for "
    "one month, plus the attendee roster. Write natural, professional "
    "minutes prose that attributes specific statements to specific named "
    "attendees. Never invent numbers -- only use the figures given to you. "
    "Respond with ONLY a JSON object with exactly these keys: "
    "discussion_highlights, decisions, action_items, next_steps. Each key "
    "maps to an array of 2-4 short sentences (each sentence should read as "
    "a natural minutes entry, most sentences naming a specific attendee)."
)

REQUIRED_KEYS = ("discussion_highlights", "decisions", "action_items", "next_steps")


def build_context(
    area_name: str,
    attendees: list[str],
    indicator_results: list[dict],
    previous_results: dict[str, str] | None = None,
    cross_area_reference: str | None = None,
) -> dict:
    return {
        "area_name": area_name,
        "attendees": attendees,
        "indicator_results": [
            {
                "code": result["code"],
                "name": result["name"],
                "result": result["result"],
                "target": result["target"],
                "status": result["status"],
                "previous_result": (previous_results or {}).get(result["code"]),
            }
            for result in indicator_results
        ],
        "cross_area_reference": cross_area_reference,
    }


def build_prompt(context: dict) -> str:
    lines = [
        f"Area: {context['area_name']}",
        f"Attendees: {', '.join(context['attendees'])}",
        "",
        "KPI results this month:",
    ]
    for result in context["indicator_results"]:
        line = f"- {result['name']}: {result['result']} vs target {result['target']} (status: {result['status']})"
        if result["previous_result"]:
            line += f", last month: {result['previous_result']}"
        lines.append(line)
    if context["cross_area_reference"]:
        lines.append("")
        lines.append(f"Cross-area note to weave in naturally if relevant: {context['cross_area_reference']}")
    lines.append("")
    lines.append("Write the minutes now.")
    return "\n".join(lines)


def parse_response(raw_text: str) -> dict:
    parsed = json.loads(raw_text)
    for key in REQUIRED_KEYS:
        if key not in parsed or not isinstance(parsed[key], list):
            raise ValueError(f"Meeting-minutes narrative response missing list key: {key!r}")
    return {key: parsed[key] for key in REQUIRED_KEYS}


def generate_narrative(context: dict, cache: LlmCache, model: str = "llama3.1:8b") -> dict:
    key = cache_key({"doc": "meeting_minutes", **context})
    cached = cache.get(key)
    if cached is not None:
        return cached

    prompt = build_prompt(context)
    raw = call_ollama(prompt, SYSTEM_PROMPT, model=model)
    result = parse_response(raw)
    cache.set(key, result)
    return result
