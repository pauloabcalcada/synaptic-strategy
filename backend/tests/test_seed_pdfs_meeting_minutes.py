"""Tests for per-area monthly meeting-minutes PDFs (Seam: app.seed.pdfs.meeting_minutes.generate_meeting_minutes)."""

from datetime import date

from pypdf import PdfReader

from app.seed.pdfs.meeting_minutes import generate_meeting_minutes

MINUTES = {
    "area_name": "Sales",
    "period": date(2024, 6, 1),
    "attendees": ["Jordan Reyes (VP Sales)", "Priya Nair (Sales Ops)"],
    "indicator_results": [
        {"code": "SALES_ACB", "name": "Active Customer Base", "result": "15,420", "target": "15,000", "status": "on_track"},
        {"code": "SALES_CONV", "name": "Conversion Rate", "result": "19.8%", "target": "22.0%", "status": "at_risk"},
    ],
    "discussion_highlights": ["Conversion softened after the pricing-page redesign rollout."],
    "decisions": ["Roll back the pricing-page redesign pending A/B re-test."],
    "action_items": ["Priya to schedule A/B re-test by July 15."],
    "next_steps": ["Reassess conversion trend at July review."],
    "cross_area_reference": "People's delayed hiring for the SDR team is constraining outbound conversion capacity.",
}


def test_generate_meeting_minutes_writes_a_valid_pdf(tmp_path):
    output_path = tmp_path / "minutes-sales-2024-06.pdf"

    result_path = generate_meeting_minutes(MINUTES, output_path)

    assert result_path == output_path
    assert output_path.read_bytes().startswith(b"%PDF-")
    PdfReader(str(output_path))


def test_generate_meeting_minutes_reflects_seeded_results_and_cross_area_reference(tmp_path):
    output_path = tmp_path / "minutes.pdf"

    generate_meeting_minutes(MINUTES, output_path)

    raw_text = "\n".join(page.extract_text() or "" for page in PdfReader(str(output_path)).pages)
    text = " ".join(raw_text.split())

    assert "Sales" in text
    assert "2024-06" in text
    for attendee in MINUTES["attendees"]:
        assert attendee in text
    for indicator_result in MINUTES["indicator_results"]:
        assert indicator_result["code"] in text
        assert indicator_result["result"] in text
        assert indicator_result["target"] in text
    assert MINUTES["decisions"][0] in text
    assert MINUTES["action_items"][0] in text
    assert MINUTES["cross_area_reference"] in text
