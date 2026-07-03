"""Generates the industry-benchmark PDF (fintech-industry averages vs. NovaPay targets)."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table


def generate_benchmark_report(benchmarks: list[dict], output_path: Path) -> Path:
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Fintech Industry KPI Benchmark Report", styles["Title"]),
        Spacer(1, 12),
    ]

    rows = [["Metric", "Industry Average", "NovaPay Target"]]
    for benchmark in benchmarks:
        rows.append([benchmark["metric"], benchmark["industry_average"], benchmark["novapay_target"]])
    story.append(Table(rows))

    SimpleDocTemplate(str(output_path), pagesize=letter).build(story)
    return output_path
