"""Tests for the indicator-methodology manual PDF (Seam: app.seed.pdfs.manual.generate_manual)."""

from pypdf import PdfReader

from app.seed.data import INDICATORS
from app.seed.pdfs.manual import generate_manual


def test_generate_manual_writes_a_valid_pdf(tmp_path):
    output_path = tmp_path / "novapay-indicator-manual-v2.pdf"

    result_path = generate_manual(INDICATORS, output_path)

    assert result_path == output_path
    assert output_path.exists()
    assert output_path.read_bytes().startswith(b"%PDF-")
    PdfReader(str(output_path))  # raises if the PDF is malformed


def test_generate_manual_covers_every_seeded_indicator(tmp_path):
    output_path = tmp_path / "manual.pdf"

    generate_manual(INDICATORS, output_path)

    raw_text = "\n".join(page.extract_text() or "" for page in PdfReader(str(output_path)).pages)
    text = " ".join(raw_text.split())
    for indicator in INDICATORS:
        assert indicator["code"] in text
        assert indicator["name"] in text
        assert indicator["calculation_method"] in text
