"""Computes department_scores per area per period from seeded results,
via the real scoring service — never hand-picked."""

from __future__ import annotations

from datetime import date
from typing import TypedDict

from app.services.scoring import compute_department_score, score_to_grade


class GeneratedDepartmentScore(TypedDict):
    period: date
    score: float
    grade: str


def generate_department_scores(
    kpi_scores_and_weights_by_period: dict[date, list[tuple[float, float]]],
) -> list[GeneratedDepartmentScore]:
    scores = []
    for period, kpi_scores_and_weights in kpi_scores_and_weights_by_period.items():
        score = compute_department_score(kpi_scores_and_weights)
        scores.append({"period": period, "score": score, "grade": score_to_grade(score)})
    return scores
