"""Generates a single area/month meeting-minutes PDF grounded in seeded KPI results."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table


def _section(story: list, styles, title: str, items: list[str]) -> None:
    story.append(Paragraph(title, styles["Heading2"]))
    story.append(ListFlowable([ListItem(Paragraph(item, styles["Normal"])) for item in items]))
    story.append(Spacer(1, 10))


def generate_meeting_minutes(minutes: dict, output_path: Path) -> Path:
    styles = getSampleStyleSheet()
    period_label = minutes["period"].strftime("%Y-%m")

    story = [
        Paragraph(f"{minutes['area_name']} Area Meeting Minutes — {period_label}", styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"Attendees: {', '.join(minutes['attendees'])}", styles["Normal"]),
        Spacer(1, 10),
    ]

    story.append(Paragraph("KPI Results Reviewed", styles["Heading2"]))
    rows = [["Code", "Indicator", "Result", "Target", "Status"]]
    for indicator_result in minutes["indicator_results"]:
        rows.append(
            [
                indicator_result["code"],
                indicator_result["name"],
                indicator_result["result"],
                indicator_result["target"],
                indicator_result["status"],
            ]
        )
    story.append(Table(rows))
    story.append(Spacer(1, 10))

    _section(story, styles, "Discussion Highlights", minutes["discussion_highlights"])
    _section(story, styles, "Decisions", minutes["decisions"])
    _section(story, styles, "Action Items", minutes["action_items"])
    _section(story, styles, "Next Steps", minutes["next_steps"])

    cross_area_reference = minutes.get("cross_area_reference")
    if cross_area_reference:
        story.append(Paragraph("Cross-Area Dependency", styles["Heading2"]))
        story.append(Paragraph(cross_area_reference, styles["Normal"]))

    SimpleDocTemplate(str(output_path), pagesize=letter).build(story)
    return output_path
