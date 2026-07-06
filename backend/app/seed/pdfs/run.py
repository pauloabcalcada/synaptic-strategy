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
from app.seed.pdfs.benchmark_report_narrative import build_context as build_benchmark_context
from app.seed.pdfs.benchmark_report_narrative import generate_narrative as generate_benchmark_narrative
from app.seed.pdfs.llm_cache import LlmCache
from app.seed.pdfs.manual import generate_manual
from app.seed.pdfs.meeting_minutes import generate_meeting_minutes
from app.seed.pdfs.meeting_minutes_narrative import build_context, generate_narrative
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


def _period_label(period: date) -> str:
    return period.strftime("%Y-%m")


def _build_results_by_area_period() -> tuple[
    dict[tuple[str, date], list[dict]], dict[tuple[str, date], dict[str, str]]
]:
    by_area_period: dict[tuple[str, date], list[dict]] = {}
    previous_by_area_period: dict[tuple[str, date], dict[str, str]] = {}

    for indicator in INDICATORS:
        generated = generate_results_for_indicator(
            indicator["code"], indicator["target"], indicator["polarity"], indicator["kpi_type"]
        )
        offset = len(generated) - RECENT_MONTHS
        for i in range(offset, len(generated)):
            entry = generated[i]
            key = (indicator["area_key"], entry["period"])
            by_area_period.setdefault(key, []).append(
                {
                    "code": indicator["code"],
                    "name": indicator["name"],
                    "result": _format_result(entry["result"], indicator["unit"]),
                    "target": _format_result(entry["target"], indicator["unit"]),
                    "result_raw": entry["result"],
                    "target_raw": entry["target"],
                    "status": entry["status"],
                }
            )
            if i > 0:
                previous_by_area_period.setdefault(key, {})[indicator["code"]] = _format_result(
                    generated[i - 1]["result"], indicator["unit"]
                )

    return by_area_period, previous_by_area_period


def _build_area_performance_summary(
    results_by_area_period: dict[tuple[str, date], list[dict]],
) -> list[dict]:
    summary = []
    for area in AREAS:
        area_key = area["key"]
        counts = {"on_track": 0, "at_risk": 0, "off_track": 0}
        for (a_key, _period), indicator_results in results_by_area_period.items():
            if a_key != area_key:
                continue
            for indicator_result in indicator_results:
                counts[indicator_result["status"]] += 1
        summary.append({"area_name": area["name"], **counts})
    return summary


def generate_all_pdfs(output_dir: Path) -> list[Path]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results_by_area_period, previous_by_area_period = _build_results_by_area_period()
    area_performance = _build_area_performance_summary(results_by_area_period)

    cache = LlmCache(output_dir / "llm_cache.json")

    benchmark_context = build_benchmark_context(BENCHMARKS, area_performance)
    benchmark_narrative = generate_benchmark_narrative(benchmark_context, cache)
    benchmark_report = {
        "benchmarks": BENCHMARKS,
        "area_performance": area_performance,
        **benchmark_narrative,
    }

    paths = [
        generate_manual(INDICATORS, output_dir / "novapay-indicator-manual-v2.pdf"),
        generate_strategic_review(STRATEGIC_REVISIONS, output_dir / "strategic-review-2024-q3.pdf"),
        generate_benchmark_report(benchmark_report, output_dir / "kpi-benchmark-report-2024.pdf"),
    ]

    for area in AREAS:
        area_key = area["key"]
        area_name = area["name"]
        periods = sorted({period for (a_key, period) in results_by_area_period if a_key == area_key})
        for period in periods:
            indicator_results = results_by_area_period[(area_key, period)]
            context = build_context(
                area_name,
                ATTENDEES_BY_AREA[area_key],
                indicator_results,
                previous_by_area_period.get((area_key, period)),
                CROSS_AREA_REFERENCES.get((area_key, period)),
            )
            narrative = generate_narrative(context, cache)

            minutes = {
                "area_name": area_name,
                "period": period,
                "attendees": ATTENDEES_BY_AREA[area_key],
                "indicator_results": indicator_results,
                "discussion_highlights": narrative["discussion_highlights"],
                "decisions": narrative["decisions"],
                "action_items": narrative["action_items"],
                "next_steps": narrative["next_steps"],
                "cross_area_reference": CROSS_AREA_REFERENCES.get((area_key, period)),
            }

            filename = f"minutes-{area_key}-{_period_label(period)}.pdf"
            paths.append(generate_meeting_minutes(minutes, output_dir / filename))

    cache.save()
    return paths
