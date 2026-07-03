"""Tests for meeting-minutes narrative generation (Seam: app.seed.pdfs.narrative.build_narrative)."""

from app.seed.pdfs.narrative import build_narrative

ON_TRACK_RESULTS = [
    {
        "code": "SALES_PSP", "name": "Sales per Salesperson", "result": "38.7", "target": "40.0",
        "status": "on_track", "result_raw": 38.7, "target_raw": 40.0,
    },
    {
        "code": "SALES_ACB", "name": "Active Customer Base", "result": "14,406.4", "target": "15,000.0",
        "status": "on_track", "result_raw": 14406.4, "target_raw": 15000.0,
    },
]

AT_RISK_RESULTS = [
    {
        "code": "FIN_OCR", "name": "Operating Cost Ratio", "result": "73.8%", "target": "62.0%",
        "status": "at_risk", "result_raw": 73.8, "target_raw": 62.0,
    },
]

OFF_TRACK_RESULTS = [
    {
        "code": "FIN_OCR", "name": "Operating Cost Ratio", "result": "84.0%", "target": "62.0%",
        "status": "off_track", "result_raw": 84.0, "target_raw": 62.0,
    },
]


def test_on_track_month_highlights_the_anchor_metrics_actual_number():
    narrative = build_narrative("Sales", ON_TRACK_RESULTS)

    discussion = " ".join(narrative["discussion_highlights"])
    assert "Sales per Salesperson" in discussion
    assert "38.7" in discussion
    assert "40.0" in discussion


def test_two_on_track_months_with_different_numbers_produce_different_discussion():
    other_month_results = [
        {**ON_TRACK_RESULTS[0], "result": "39.4", "result_raw": 39.4},
        ON_TRACK_RESULTS[1],
    ]

    narrative_a = build_narrative("Sales", ON_TRACK_RESULTS)
    narrative_b = build_narrative("Sales", other_month_results)

    assert narrative_a["discussion_highlights"] != narrative_b["discussion_highlights"]


def test_at_risk_indicator_names_the_metric_and_gap_in_discussion_and_decisions():
    narrative = build_narrative("Finance", AT_RISK_RESULTS)

    discussion = " ".join(narrative["discussion_highlights"])
    decisions = " ".join(narrative["decisions"])
    action_items = " ".join(narrative["action_items"])

    assert "Operating Cost Ratio" in discussion
    assert "73.8%" in discussion
    assert "62.0%" in discussion
    assert "19.0%" in discussion  # (73.8 - 62.0) / 62.0 = 19.03%
    assert "Operating Cost Ratio" in decisions
    assert "Operating Cost Ratio" in action_items


def test_off_track_indicator_escalates_with_the_actual_gap():
    narrative = build_narrative("Finance", OFF_TRACK_RESULTS)

    discussion = " ".join(narrative["discussion_highlights"])
    decisions = " ".join(narrative["decisions"])

    assert "Operating Cost Ratio" in discussion
    assert "84.0%" in discussion
    assert "35.5%" in discussion  # (84.0 - 62.0) / 62.0 = 35.48%
    assert "escalat" in " ".join(narrative["decisions"]).lower()
    assert decisions  # a decision is recorded


def test_at_risk_mentions_prior_month_result_when_available():
    previous_results = {"FIN_OCR": "68.1%"}

    narrative = build_narrative("Finance", AT_RISK_RESULTS, previous_results=previous_results)

    discussion = " ".join(narrative["discussion_highlights"])
    assert "68.1" in discussion


def test_next_steps_reference_the_area_and_named_at_risk_metric():
    narrative = build_narrative("Finance", AT_RISK_RESULTS)

    next_steps = " ".join(narrative["next_steps"])
    assert "Finance" in next_steps
    assert "Operating Cost Ratio" in next_steps
