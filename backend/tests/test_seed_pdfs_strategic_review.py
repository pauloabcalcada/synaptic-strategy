"""Tests for the quarterly strategic-review PDF (Seam: app.seed.pdfs.strategic_review.generate_strategic_review)."""

from pypdf import PdfReader

from app.seed.pdfs.strategic_review import generate_strategic_review

REVISIONS = [
    {
        "indicator_code": "FIN_REV",
        "quarter": "2023-Q3",
        "rationale": "Revenue dipped in Aug 2023 due to a delayed enterprise renewal; target held steady as the pipeline recovered by Q4.",
    },
    {
        "indicator_code": "TECH_UPTIME",
        "quarter": "2023-Q2",
        "rationale": "A June 2023 core-banking incident drove a sudden uptime drop; remediation restored the trajectory the following month.",
    },
]


def test_generate_strategic_review_writes_a_valid_pdf(tmp_path):
    output_path = tmp_path / "strategic-review-2024-q3.pdf"

    result_path = generate_strategic_review(REVISIONS, output_path)

    assert result_path == output_path
    assert output_path.read_bytes().startswith(b"%PDF-")
    PdfReader(str(output_path))


def test_generate_strategic_review_includes_each_revision_rationale(tmp_path):
    output_path = tmp_path / "strategic-review.pdf"

    generate_strategic_review(REVISIONS, output_path)

    raw_text = "\n".join(page.extract_text() or "" for page in PdfReader(str(output_path)).pages)
    text = " ".join(raw_text.split())
    for revision in REVISIONS:
        assert revision["indicator_code"] in text
        assert revision["rationale"] in text
