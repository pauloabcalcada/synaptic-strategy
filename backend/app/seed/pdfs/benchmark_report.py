"""Generates the industry-benchmark PDF (fintech-industry averages vs. NovaPay
targets), plus an LLM-grounded market analysis: exec summary, SWOT, and
strategic recommendations.
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
)


def _bulleted(story: list, styles, title: str, items: list[str]) -> None:
    story.append(Paragraph(title, styles["Heading3"]))
    story.append(ListFlowable([ListItem(Paragraph(item, styles["Normal"])) for item in items]))
    story.append(Spacer(1, 8))


def generate_benchmark_report(report: dict, output_path: Path) -> Path:
    styles = getSampleStyleSheet()

    # Page 1: title, executive summary.
    story = [
        Paragraph("Fintech Industry KPI Benchmark Report", styles["Title"]),
        Spacer(1, 12),
        Paragraph("Executive Summary", styles["Heading2"]),
        Paragraph(report["exec_summary"], styles["Normal"]),
        PageBreak(),
    ]

    # Page 2: benchmark table, area performance table.
    story.append(Paragraph("Industry Benchmarks", styles["Heading2"]))
    rows = [["Metric", "Industry Average", "NovaPay Target"]]
    for benchmark in report["benchmarks"]:
        rows.append([benchmark["metric"], benchmark["industry_average"], benchmark["novapay_target"]])
    story.append(Table(rows))
    story.append(Spacer(1, 16))

    story.append(Paragraph("2024 KPI Performance by Area", styles["Heading2"]))
    area_rows = [["Area", "On Track", "At Risk", "Off Track"]]
    for area in report["area_performance"]:
        area_rows.append(
            [area["area_name"], str(area["on_track"]), str(area["at_risk"]), str(area["off_track"])]
        )
    story.append(Table(area_rows))
    story.append(PageBreak())

    # Page 3: SWOT.
    story.append(Paragraph("Market Analysis (SWOT)", styles["Heading2"]))
    swot = report["swot"]
    _bulleted(story, styles, "Strengths", swot["strengths"])
    _bulleted(story, styles, "Weaknesses", swot["weaknesses"])
    _bulleted(story, styles, "Opportunities", swot["opportunities"])
    _bulleted(story, styles, "Threats", swot["threats"])
    story.append(PageBreak())

    # Page 4: recommendations.
    story.append(Paragraph("Strategic Recommendations", styles["Heading2"]))
    story.append(
        ListFlowable(
            [ListItem(Paragraph(item, styles["Normal"])) for item in report["recommendations"]]
        )
    )

    SimpleDocTemplate(str(output_path), pagesize=letter).build(story)
    return output_path
