"""Builds LLM-generated market-analysis narrative (SWOT + insights) for the
KPI benchmark report, grounded in the exact benchmark rows and the 2024
area-performance summary rather than generic market boilerplate.
"""

from __future__ import annotations

import json

from app.seed.pdfs.llm import call_ollama
from app.seed.pdfs.llm_cache import LlmCache, cache_key

SYSTEM_PROMPT = (
    "You write a market-analysis section for a fintech company called "
    "NovaPay's annual KPI benchmark report. You are given NovaPay's exact "
    "industry-benchmark metrics and a summary of NovaPay's 2024 KPI "
    "performance by area. Never invent numbers -- only use the figures "
    "given to you. Respond with ONLY a JSON object with exactly these "
    "keys: exec_summary, swot, recommendations. exec_summary is a single "
    "string (2-4 sentences). swot is an object with keys strengths, "
    "weaknesses, opportunities, threats, each an array of 2-4 short "
    "sentences grounded in the given facts. recommendations is an array "
    "of 2-4 short, forward-looking sentences tied to the SWOT."
)

REQUIRED_KEYS = ("exec_summary", "swot", "recommendations")
REQUIRED_SWOT_KEYS = ("strengths", "weaknesses", "opportunities", "threats")


def build_context(benchmarks: list[dict], area_performance: list[dict]) -> dict:
    return {
        "benchmarks": benchmarks,
        "area_performance": area_performance,
    }


def build_prompt(context: dict) -> str:
    lines = ["Industry benchmark metrics:"]
    for benchmark in context["benchmarks"]:
        lines.append(
            f"- {benchmark['metric']}: industry average {benchmark['industry_average']}, "
            f"NovaPay target {benchmark['novapay_target']}"
        )
    lines.append("")
    lines.append("NovaPay 2024 KPI performance by area (indicator-months by status):")
    for area in context["area_performance"]:
        lines.append(
            f"- {area['area_name']}: {area['on_track']} on-track, {area['at_risk']} at-risk, "
            f"{area['off_track']} off-track"
        )
    lines.append("")
    lines.append("Write the market analysis now.")
    return "\n".join(lines)


def parse_response(raw_text: str) -> dict:
    parsed = json.loads(raw_text)
    for key in REQUIRED_KEYS:
        if key not in parsed:
            raise ValueError(f"Benchmark narrative response missing key: {key!r}")
    if not isinstance(parsed["exec_summary"], str):
        raise ValueError("Benchmark narrative response 'exec_summary' must be a string")
    if not isinstance(parsed["recommendations"], list):
        raise ValueError("Benchmark narrative response 'recommendations' must be a list")
    swot = parsed["swot"]
    for key in REQUIRED_SWOT_KEYS:
        if key not in swot or not isinstance(swot[key], list):
            raise ValueError(f"Benchmark narrative response missing swot list key: {key!r}")
    return {
        "exec_summary": parsed["exec_summary"],
        "swot": {key: swot[key] for key in REQUIRED_SWOT_KEYS},
        "recommendations": parsed["recommendations"],
    }


def generate_narrative(context: dict, cache: LlmCache, model: str = "llama3.1:8b") -> dict:
    key = cache_key({"doc": "benchmark_report", **context})
    cached = cache.get(key)
    if cached is not None:
        return cached

    prompt = build_prompt(context)
    raw = call_ollama(prompt, SYSTEM_PROMPT, model=model)
    result = parse_response(raw)
    cache.set(key, result)
    return result
