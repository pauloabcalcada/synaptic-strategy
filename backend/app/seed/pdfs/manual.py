"""Generates the indicator-methodology manual PDF covering all seeded KPIs."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def generate_manual(indicators: list[dict], output_path: Path) -> Path:
    styles = getSampleStyleSheet()
    story = [Paragraph("NovaPay Indicator Methodology Manual", styles["Title"]), Spacer(1, 12)]

    for indicator in indicators:
        story.append(Paragraph(f"{indicator['code']} — {indicator['name']}", styles["Heading2"]))
        story.append(Paragraph(f"Unit: {indicator['unit']}", styles["Normal"]))
        story.append(Paragraph(f"Calculation method: {indicator['calculation_method']}", styles["Normal"]))
        story.append(Paragraph(f"Composition: {indicator['composition']}", styles["Normal"]))
        story.append(Paragraph("Data source: NovaPay internal systems of record.", styles["Normal"]))
        story.append(Paragraph("Revision notes: No revisions since initial publication.", styles["Normal"]))
        story.append(Spacer(1, 10))

    SimpleDocTemplate(str(output_path), pagesize=letter).build(story)
    return output_path
