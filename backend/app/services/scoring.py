"""KPI scoring service — pure functions, no DB/IO."""

from __future__ import annotations

from typing import Sequence

GRADE_BRACKETS: dict[str, float] = {"A": 85.0, "B": 70.0, "C": 50.0, "D": 0.0}
STATUS_TOLERANCE = 0.10


def compute_kpi_score(
    result: float,
    target: float,
    polarity: str,
    kpi_type: str,
    over_achievement_threshold: float = 0.10,
) -> float:
    if kpi_type == "milestone":
        return 100.0 if result >= target else 0.0

    achievement_ratio = (
        result / target if polarity == "higher_is_better" else target / result
    )

    if achievement_ratio >= 1.0 + over_achievement_threshold:
        return 100.0
    if achievement_ratio >= 1.0:
        return 70.0 + (achievement_ratio - 1.0) / over_achievement_threshold * 30.0
    if achievement_ratio >= 0.7:
        return (achievement_ratio - 0.7) / 0.3 * 70.0
    return 0.0


def compute_department_score(
    kpi_scores_and_weights: Sequence[tuple[float, float]],
) -> float:
    return sum(score * weight for score, weight in kpi_scores_and_weights)


def score_to_grade(score: float) -> str:
    for grade, threshold in GRADE_BRACKETS.items():
        if score >= threshold:
            return grade
    return "D"


def compute_variance(
    result: float,
    target: float,
    polarity: str,
) -> float:
    diff = result - target
    return diff if polarity == "higher_is_better" else -diff


def compute_status(
    result: float,
    target: float,
    polarity: str,
    tolerance: float,
) -> str:
    achievement_ratio = (
        result / target if polarity == "higher_is_better" else target / result
    )
    if achievement_ratio >= 1.0 - tolerance:
        return "on_track"
    if achievement_ratio >= 1.0 - 2 * tolerance:
        return "at_risk"
    return "off_track"
