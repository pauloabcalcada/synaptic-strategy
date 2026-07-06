"""Tests for the industry-benchmark PDF (Seam: app.seed.pdfs.benchmark_report.generate_benchmark_report)."""

from pypdf import PdfReader

from app.seed.pdfs.benchmark_report import generate_benchmark_report

BENCHMARKS = [
    {"metric": "Churn Rate", "industry_average": "4.2%", "novapay_target": "3.5%"},
    {"metric": "Conversion Rate", "industry_average": "18.0%", "novapay_target": "22.0%"},
    {"metric": "Platform Uptime", "industry_average": "99.2%", "novapay_target": "99.5%"},
]

AREA_PERFORMANCE = [
    {"area_name": "Finance", "on_track": 8, "at_risk": 3, "off_track": 1},
    {"area_name": "Sales", "on_track": 7, "at_risk": 4, "off_track": 1},
]

REPORT = {
    "benchmarks": BENCHMARKS,
    "area_performance": AREA_PERFORMANCE,
    "exec_summary": "NovaPay outperforms industry benchmarks on conversion and uptime.",
    "swot": {
        "strengths": ["Platform uptime beats the industry average of 99.2%."],
        "weaknesses": ["Churn rate remains above the 3.5% NovaPay target."],
        "opportunities": ["Conversion rate gains suggest room to expand share."],
        "threats": ["Industry churn pressure could erode recent gains."],
    },
    "recommendations": ["Invest further in retention programs to close the churn gap."],
}


def test_generate_benchmark_report_writes_a_valid_pdf(tmp_path):
    output_path = tmp_path / "kpi-benchmark-report-2024.pdf"

    result_path = generate_benchmark_report(REPORT, output_path)

    assert result_path == output_path
    assert output_path.read_bytes().startswith(b"%PDF-")
    PdfReader(str(output_path))


def test_generate_benchmark_report_includes_each_benchmark_metric(tmp_path):
    output_path = tmp_path / "benchmark.pdf"

    generate_benchmark_report(REPORT, output_path)

    raw_text = "\n".join(page.extract_text() or "" for page in PdfReader(str(output_path)).pages)
    text = " ".join(raw_text.split())
    for benchmark in BENCHMARKS:
        assert benchmark["metric"] in text
        assert benchmark["industry_average"] in text
        assert benchmark["novapay_target"] in text


def test_generate_benchmark_report_includes_market_analysis_sections(tmp_path):
    output_path = tmp_path / "benchmark.pdf"

    generate_benchmark_report(REPORT, output_path)

    raw_text = "\n".join(page.extract_text() or "" for page in PdfReader(str(output_path)).pages)
    text = " ".join(raw_text.split())
    assert REPORT["exec_summary"] in text
    for quadrant_items in REPORT["swot"].values():
        for item in quadrant_items:
            assert item in text
    for recommendation in REPORT["recommendations"]:
        assert recommendation in text


def test_generate_benchmark_report_is_at_least_three_pages(tmp_path):
    output_path = tmp_path / "benchmark.pdf"

    generate_benchmark_report(REPORT, output_path)

    assert len(PdfReader(str(output_path)).pages) >= 3
