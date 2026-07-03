"""Generates all 63 seed PDFs (3 knowledge-base + 60 meeting minutes) to a directory.

Meeting-minutes content is grounded in the same deterministic result
generation used to seed `indicator_results` (app.seed.generate_results), so
the numbers on each PDF always match what the DB seed produces for that
area/period — without requiring a live database connection here.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from app.seed.data import AREAS, INDICATORS
from app.seed.generate_results import generate_results_for_indicator
from app.seed.pdfs.benchmark_report import generate_benchmark_report
from app.seed.pdfs.manual import generate_manual
from app.seed.pdfs.meeting_minutes import generate_meeting_minutes
from app.seed.pdfs.strategic_review import generate_strategic_review

RECENT_MONTHS = 12  # of the 24 seeded months (indices 12-23 => calendar year 2024)

ATTENDEES_BY_AREA = {
    "finance": ["Alex Kim (CFO)", "Morgan Diaz (FP&A Lead)"],
    "sales": ["Jordan Reyes (VP Sales)", "Priya Nair (Sales Ops)"],
    "people": ["Sam Okafor (Head of People)", "Lena Brandt (Talent Acquisition)"],
    "governance": ["Dana Whitfield (Chief Compliance Officer)", "Rui Tanaka (Risk Lead)"],
    "technology": ["Chris Bello (CTO)", "Ines Alvarez (SRE Lead)"],
}

STRATEGIC_REVISIONS = [
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
    {
        "indicator_code": "PEOPLE_HCG",
        "quarter": "2024-Q3",
        "rationale": "Hiring slowed in Aug 2024 as sourcing bottlenecks emerged; target retained given the Q4 recovery plan.",
    },
]

BENCHMARKS = [
    {"metric": "Churn Rate", "industry_average": "4.2%", "novapay_target": "3.5%"},
    {"metric": "Conversion Rate", "industry_average": "18.0%", "novapay_target": "22.0%"},
    {"metric": "Platform Uptime", "industry_average": "99.2%", "novapay_target": "99.5%"},
]

# Hardcoded cross-area dependencies: (area_key, period, reference text).
CROSS_AREA_REFERENCES = {
    ("sales", date(2024, 8, 1)): (
        "People's delayed hiring for the SDR team is constraining outbound conversion capacity."
    ),
    ("finance", date(2024, 7, 1)): (
        "Sales' elevated churn this month is directly reducing recognized recurring revenue."
    ),
    ("sales", date(2024, 10, 1)): (
        "Governance's SLA compliance dip this month is contributing to elevated customer churn risk."
    ),
}


def _format_result(value: float, unit: str) -> str:
    if unit == "percentage":
        return f"{value:.1f}%"
    if unit == "currency":
        return f"{value:,.2f}"
    return f"{value:,.1f}"


def _status_narrative(area_name: str, off_track: list[dict], at_risk: list[dict]) -> tuple[list[str], list[str], list[str], list[str]]:
    if off_track:
        names = ", ".join(r["name"] for r in off_track)
        discussion = [f"{names} came in off track this month; root causes were reviewed."]
        decisions = [f"Escalate remediation for {names} to the {area_name} leadership team."]
        action_items = [f"Owner to present a recovery plan for {names} at next month's review."]
    elif at_risk:
        names = ", ".join(r["name"] for r in at_risk)
        discussion = [f"{names} is trending at risk; contributing factors were discussed."]
        decisions = [f"Monitor {names} closely and revisit mitigation options next month."]
        action_items = [f"Owner to report back on {names} trend at next review."]
    else:
        discussion = ["All reviewed indicators are on track this month."]
        decisions = ["Maintain current execution plan."]
        action_items = ["No new action items; continue monitoring."]
    next_steps = [f"Reconvene next month to review {area_name} KPI progress."]
    return discussion, decisions, action_items, next_steps


def _period_label(period: date) -> str:
    return period.strftime("%Y-%m")


def _build_results_by_area_period() -> dict[tuple[str, date], list[dict]]:
    by_area_period: dict[tuple[str, date], list[dict]] = {}
    for indicator in INDICATORS:
        generated = generate_results_for_indicator(
            indicator["code"], indicator["target"], indicator["polarity"], indicator["kpi_type"]
        )
        recent = generated[-RECENT_MONTHS:]
        for entry in recent:
            key = (indicator["area_key"], entry["period"])
            by_area_period.setdefault(key, []).append(
                {
                    "code": indicator["code"],
                    "name": indicator["name"],
                    "result": _format_result(entry["result"], indicator["unit"]),
                    "target": _format_result(entry["target"], indicator["unit"]),
                    "status": entry["status"],
                    "status_raw": entry["status"],
                }
            )
    return by_area_period


def generate_all_pdfs(output_dir: Path) -> list[Path]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    paths = [
        generate_manual(INDICATORS, output_dir / "novapay-indicator-manual-v2.pdf"),
        generate_strategic_review(STRATEGIC_REVISIONS, output_dir / "strategic-review-2024-q3.pdf"),
        generate_benchmark_report(BENCHMARKS, output_dir / "kpi-benchmark-report-2024.pdf"),
    ]

    results_by_area_period = _build_results_by_area_period()

    for area in AREAS:
        area_key = area["key"]
        area_name = area["name"]
        periods = sorted({period for (a_key, period) in results_by_area_period if a_key == area_key})
        for period in periods:
            indicator_results = results_by_area_period[(area_key, period)]
            off_track = [r for r in indicator_results if r["status_raw"] == "off_track"]
            at_risk = [r for r in indicator_results if r["status_raw"] == "at_risk"]
            discussion, decisions, action_items, next_steps = _status_narrative(
                area_name, off_track, at_risk
            )

            minutes = {
                "area_name": area_name,
                "period": period,
                "attendees": ATTENDEES_BY_AREA[area_key],
                "indicator_results": indicator_results,
                "discussion_highlights": discussion,
                "decisions": decisions,
                "action_items": action_items,
                "next_steps": next_steps,
                "cross_area_reference": CROSS_AREA_REFERENCES.get((area_key, period)),
            }

            filename = f"minutes-{area_key}-{_period_label(period)}.pdf"
            paths.append(generate_meeting_minutes(minutes, output_dir / filename))

    return paths
