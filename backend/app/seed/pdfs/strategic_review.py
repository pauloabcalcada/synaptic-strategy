"""Generates the quarterly strategic-review PDF referencing target-revision rationale."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def generate_strategic_review(revisions: list[dict], output_path: Path) -> Path:
    styles = getSampleStyleSheet()
    story = [Paragraph("NovaPay Quarterly Strategic Review", styles["Title"]), Spacer(1, 12)]

    for revision in revisions:
        story.append(
            Paragraph(f"{revision['indicator_code']} — {revision['quarter']}", styles["Heading2"])
        )
        story.append(Paragraph(revision["rationale"], styles["Normal"]))
        story.append(Spacer(1, 10))

    SimpleDocTemplate(str(output_path), pagesize=letter).build(story)
    return output_path
