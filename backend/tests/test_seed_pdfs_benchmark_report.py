"""Tests for the industry-benchmark PDF (Seam: app.seed.pdfs.benchmark_report.generate_benchmark_report)."""

from pypdf import PdfReader

from app.seed.pdfs.benchmark_report import generate_benchmark_report

BENCHMARKS = [
    {"metric": "Churn Rate", "industry_average": "4.2%", "novapay_target": "3.5%"},
    {"metric": "Conversion Rate", "industry_average": "18.0%", "novapay_target": "22.0%"},
    {"metric": "Platform Uptime", "industry_average": "99.2%", "novapay_target": "99.5%"},
]


def test_generate_benchmark_report_writes_a_valid_pdf(tmp_path):
    output_path = tmp_path / "kpi-benchmark-report-2024.pdf"

    result_path = generate_benchmark_report(BENCHMARKS, output_path)

    assert result_path == output_path
    assert output_path.read_bytes().startswith(b"%PDF-")
    PdfReader(str(output_path))


def test_generate_benchmark_report_includes_each_benchmark_metric(tmp_path):
    output_path = tmp_path / "benchmark.pdf"

    generate_benchmark_report(BENCHMARKS, output_path)

    raw_text = "\n".join(page.extract_text() or "" for page in PdfReader(str(output_path)).pages)
    text = " ".join(raw_text.split())
    for benchmark in BENCHMARKS:
        assert benchmark["metric"] in text
        assert benchmark["industry_average"] in text
        assert benchmark["novapay_target"] in text
