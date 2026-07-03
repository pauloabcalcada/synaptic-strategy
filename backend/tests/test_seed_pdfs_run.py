"""Integration tests for the PDF-generation entrypoint (Seam: app.seed.pdfs.run.generate_all_pdfs)."""

import re

from pypdf import PdfReader

from app.seed.data import AREAS
from app.seed.pdfs.run import generate_all_pdfs

KB_FILENAMES = {
    "novapay-indicator-manual-v2.pdf",
    "strategic-review-2024-q3.pdf",
    "kpi-benchmark-report-2024.pdf",
}
MINUTES_PATTERN = re.compile(r"^minutes-(?P<area>[a-z]+)-(?P<period>\d{4}-\d{2})\.pdf$")


def _extract_text(path) -> str:
    raw_text = "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
    return " ".join(raw_text.split())


def test_generate_all_pdfs_produces_63_valid_pdfs(tmp_path):
    paths = generate_all_pdfs(tmp_path)

    assert len(paths) == 63
    for path in paths:
        assert path.exists()
        assert path.read_bytes().startswith(b"%PDF-")

    filenames = {path.name for path in paths}
    assert KB_FILENAMES <= filenames

    minutes_filenames = filenames - KB_FILENAMES
    assert len(minutes_filenames) == 60

    area_slugs = {area["key"] for area in AREAS}
    periods_by_area: dict[str, set[str]] = {}
    for filename in minutes_filenames:
        match = MINUTES_PATTERN.match(filename)
        assert match, filename
        assert match.group("area") in area_slugs
        periods_by_area.setdefault(match.group("area"), set()).add(match.group("period"))

    assert set(periods_by_area) == area_slugs
    for area_key, periods in periods_by_area.items():
        assert len(periods) == 12, area_key
        assert periods == {f"2024-{month:02d}" for month in range(1, 13)}, area_key


def test_generate_all_pdfs_includes_cross_area_references(tmp_path):
    paths = generate_all_pdfs(tmp_path)

    minutes_paths = [p for p in paths if p.name.startswith("minutes-")]
    cross_area_count = sum(
        1 for path in minutes_paths if "Cross-Area Dependency" in _extract_text(path)
    )
    assert cross_area_count >= 2


def test_generate_all_pdfs_manual_covers_all_seeded_indicators(tmp_path):
    paths = generate_all_pdfs(tmp_path)

    manual_path = next(p for p in paths if p.name == "novapay-indicator-manual-v2.pdf")
    text = _extract_text(manual_path)
    from app.seed.data import INDICATORS

    for indicator in INDICATORS:
        assert indicator["code"] in text
