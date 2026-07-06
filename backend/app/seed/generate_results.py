"""Generates 24 months of narratively-coherent results per indicator.

Every result's kpi_score/status is produced by calling the real scoring
service (app.services.scoring) — never hand-picked — so seed data and
scoring logic can never drift apart.
"""

from __future__ import annotations

import math
import random
from datetime import date
from typing import TypedDict

from app.services.scoring import STATUS_TOLERANCE, compute_kpi_score, compute_status

PERIODS = 24
START_PERIOD = date(2023, 1, 1)
TOLERANCE = STATUS_TOLERANCE
OFF_TRACK_DIP_RATIO = 0.62
SETBACK_RATIO = 0.84
SUDDEN_DROP_RATIO = 0.55

# Achievement-ratio trajectory per numerical indicator: linear growth from
# `start` to `end` (achievement_ratio = result/target, or target/result for
# lower_is_better — see `_ratio_to_result`), plus small seeded noise.
# `dips` (month indices 0-11) force a sharp off-track dip; `setbacks`
# (month indices 12-23) force a milder at-risk dip — "improvement with
# occasional setbacks" in the second year. `seasonal` adds a yearly cycle.
# `sudden_drop_month` forces one single-month sharp drop anywhere in the
# series (the Deviation Diagnostic "sudden_drop" pattern).
NUMERICAL_NARRATIVE = {
    "FIN_REV": {"start": 0.88, "end": 1.07, "dips": [2, 7], "setbacks": [15]},
    "FIN_OCR": {"start": 0.88, "end": 1.06, "dips": [4], "setbacks": [16]},
    "FIN_EBITDA": {"start": 0.87, "end": 1.05, "dips": [9], "setbacks": [14]},
    "FIN_ARPU": {"start": 0.88, "end": 1.04, "dips": [5], "setbacks": []},
    "SALES_PSP": {"start": 0.86, "end": 1.06, "dips": [3, 8], "setbacks": [13]},
    "SALES_ACB": {"start": 0.88, "end": 1.05, "dips": [6], "setbacks": [], "seasonal": True},
    "SALES_CHURN": {"start": 0.87, "end": 1.06, "dips": [1], "setbacks": [18]},
    "SALES_CONV": {"start": 0.86, "end": 1.05, "dips": [10], "setbacks": [17]},
    "PEOPLE_HCG": {"start": 0.85, "end": 1.05, "dips": [4, 9], "setbacks": [19]},
    "PEOPLE_TURN": {"start": 0.87, "end": 1.04, "dips": [2], "setbacks": [20]},
    "GOV_SLA": {"start": 0.89, "end": 1.03, "dips": [5], "setbacks": [21]},
    "GOV_AUDIT": {"start": 0.86, "end": 1.05, "dips": [8], "setbacks": [16]},
    "TECH_UPTIME": {"start": 0.95, "end": 1.02, "dips": [], "setbacks": [], "sudden_drop_month": 5},
    "TECH_MTTR": {"start": 0.86, "end": 1.05, "dips": [3], "setbacks": [19]},
    "TECH_CYCLE": {"start": 0.87, "end": 1.04, "dips": [7], "setbacks": [15]},
}

# Milestone indicators: binary achieved/not-achieved per month.
# `miss_months` (indices in 1-12 are dips, 13-24 are setbacks).
MILESTONE_NARRATIVE = {
    "PEOPLE_TTF": {"miss_months": [1, 5, 9, 15]},
    "GOV_REG": {"miss_months": [3, 8, 18]},
}


class GeneratedResult(TypedDict):
    period: date
    result: float
    target: float
    kpi_score: float
    status: str


def _period_for(month_index: int) -> date:
    month = START_PERIOD.month - 1 + month_index
    year = START_PERIOD.year + month // 12
    month = month % 12 + 1
    return date(year, month, 1)


def _ratio_to_result(ratio: float, target: float, polarity: str) -> float:
    if polarity == "higher_is_better":
        return round(ratio * target, 4)
    return round(target / ratio, 4)


def _numerical_series_ratios(code: str, config: dict) -> list[float]:
    rng = random.Random(f"novapay-{code}")
    ratios = []
    for i in range(PERIODS):
        base = config["start"] + (config["end"] - config["start"]) * (i / (PERIODS - 1))
        base += rng.uniform(-0.02, 0.02)
        if config.get("seasonal"):
            base += 0.06 * math.sin(2 * math.pi * (i % 12) / 12)
        if i in config.get("dips", []):
            base = OFF_TRACK_DIP_RATIO
        if i in config.get("setbacks", []):
            base = SETBACK_RATIO
        if config.get("sudden_drop_month") == i:
            base = SUDDEN_DROP_RATIO
        ratios.append(base)
    return ratios


def generate_numerical_results(
    code: str, target: float, polarity: str, kpi_type: str
) -> list[GeneratedResult]:
    config = NUMERICAL_NARRATIVE[code]
    ratios = _numerical_series_ratios(code, config)
    results: list[GeneratedResult] = []
    for i, ratio in enumerate(ratios):
        result_value = _ratio_to_result(ratio, target, polarity)
        score = compute_kpi_score(result_value, target, polarity, kpi_type)
        status = compute_status(result_value, target, polarity, TOLERANCE)
        results.append(
            {
                "period": _period_for(i),
                "result": result_value,
                "target": target,
                "kpi_score": score,
                "status": status,
            }
        )
    return results


def generate_milestone_results(code: str, kpi_type: str) -> list[GeneratedResult]:
    config = MILESTONE_NARRATIVE[code]
    miss_months = set(config["miss_months"])
    target = 1.0
    # Achieved is always the "good" direction, so status/score are computed
    # with higher_is_better regardless of the indicator's documented
    # polarity — the binary achieved-flag itself is a higher-is-better
    # signal even when the underlying raw metric is lower_is_better.
    polarity = "higher_is_better"
    results: list[GeneratedResult] = []
    for i in range(PERIODS):
        result_value = 0.0 if i in miss_months else 1.0
        score = compute_kpi_score(result_value, target, polarity, kpi_type)
        status = compute_status(result_value, target, polarity, TOLERANCE)
        results.append(
            {
                "period": _period_for(i),
                "result": result_value,
                "target": target,
                "kpi_score": score,
                "status": status,
            }
        )
    return results


def generate_results_for_indicator(
    code: str, target: float, polarity: str, kpi_type: str
) -> list[GeneratedResult]:
    if kpi_type == "milestone":
        return generate_milestone_results(code, kpi_type)
    return generate_numerical_results(code, target, polarity, kpi_type)
