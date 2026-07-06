"""Tests for LLM-generated meeting-minutes narrative
(Seam: app.seed.pdfs.meeting_minutes_narrative).
"""

import json

import pytest

from app.seed.pdfs import meeting_minutes_narrative
from app.seed.pdfs.llm_cache import LlmCache
from app.seed.pdfs.meeting_minutes_narrative import (
    build_context,
    build_prompt,
    generate_narrative,
    parse_response,
)

SAMPLE_INDICATOR_RESULTS = [
    {
        "code": "SALES_PSP", "name": "Sales per Salesperson",
        "result": "33.6", "target": "40.0", "status": "at_risk",
    },
]


def test_build_context_includes_previous_result_and_cross_area_reference():
    context = build_context(
        area_name="Sales",
        attendees=["Jordan Reyes (VP Sales, Director)"],
        indicator_results=SAMPLE_INDICATOR_RESULTS,
        previous_results={"SALES_PSP": "38.7"},
        cross_area_reference="People's delayed hiring is constraining conversion capacity.",
    )

    assert context["indicator_results"][0]["previous_result"] == "38.7"
    assert context["cross_area_reference"] == (
        "People's delayed hiring is constraining conversion capacity."
    )


def test_build_context_previous_result_is_none_when_not_given():
    context = build_context(
        area_name="Sales",
        attendees=["Jordan Reyes (VP Sales, Director)"],
        indicator_results=SAMPLE_INDICATOR_RESULTS,
    )

    assert context["indicator_results"][0]["previous_result"] is None
    assert context["cross_area_reference"] is None


def test_build_prompt_includes_every_fact_from_context():
    context = build_context(
        area_name="Sales",
        attendees=["Jordan Reyes (VP Sales, Director)"],
        indicator_results=SAMPLE_INDICATOR_RESULTS,
        previous_results={"SALES_PSP": "38.7"},
        cross_area_reference="People's delayed hiring is constraining conversion capacity.",
    )

    prompt = build_prompt(context)

    assert "Sales" in prompt
    assert "Jordan Reyes (VP Sales, Director)" in prompt
    assert "Sales per Salesperson" in prompt
    assert "33.6" in prompt
    assert "40.0" in prompt
    assert "38.7" in prompt
    assert "People's delayed hiring is constraining conversion capacity." in prompt


def test_parse_response_extracts_all_four_sections():
    raw = json.dumps({
        "discussion_highlights": ["a"],
        "decisions": ["b"],
        "action_items": ["c"],
        "next_steps": ["d"],
    })

    assert parse_response(raw) == {
        "discussion_highlights": ["a"],
        "decisions": ["b"],
        "action_items": ["c"],
        "next_steps": ["d"],
    }


def test_parse_response_raises_on_missing_key():
    raw = json.dumps({"discussion_highlights": ["a"]})

    with pytest.raises(ValueError, match="decisions"):
        parse_response(raw)


def test_generate_narrative_grounds_real_numbers_and_names(tmp_path):
    cache = LlmCache(tmp_path / "cache.json")
    context = build_context(
        area_name="Sales",
        attendees=["Jordan Reyes (VP Sales, Director)", "Priya Nair (Sales Operations Manager)"],
        indicator_results=SAMPLE_INDICATOR_RESULTS,
        previous_results={"SALES_PSP": "38.7"},
    )

    narrative = generate_narrative(context, cache)

    all_text = " ".join(
        narrative["discussion_highlights"] + narrative["decisions"]
        + narrative["action_items"] + narrative["next_steps"]
    )
    assert "33.6" in all_text
    assert "Sales per Salesperson" in all_text


def test_generate_narrative_is_served_from_cache_on_second_call(tmp_path, monkeypatch):
    cache = LlmCache(tmp_path / "cache.json")
    context = build_context(
        area_name="Sales",
        attendees=["Jordan Reyes (VP Sales, Director)"],
        indicator_results=[
            {
                "code": "SALES_ACB", "name": "Active Customer Base",
                "result": "15,236", "target": "15,000", "status": "on_track",
            },
        ],
    )

    generate_narrative(context, cache)

    call_count = {"n": 0}
    original = meeting_minutes_narrative.call_ollama

    def counting_call_ollama(*args, **kwargs):
        call_count["n"] += 1
        return original(*args, **kwargs)

    monkeypatch.setattr(meeting_minutes_narrative, "call_ollama", counting_call_ollama)

    generate_narrative(context, cache)

    assert call_count["n"] == 0
