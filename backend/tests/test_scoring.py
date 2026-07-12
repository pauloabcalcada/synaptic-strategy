"""Unit tests for the KPI scoring service (pure functions, no DB/IO)."""

import pytest

from app.services.scoring import (
    compute_department_score,
    compute_kpi_score,
    compute_status,
    compute_variance,
    score_to_grade,
)


# ---------------------------------------------------------------------------
# score_to_grade
# ---------------------------------------------------------------------------


class TestScoreToGrade:
    def test_returns_A_at_85(self):
        assert score_to_grade(85) == "A"

    def test_returns_A_at_100(self):
        assert score_to_grade(100) == "A"

    def test_returns_B_at_84(self):
        assert score_to_grade(84) == "B"

    def test_returns_B_at_70(self):
        assert score_to_grade(70) == "B"

    def test_returns_C_at_69(self):
        assert score_to_grade(69) == "C"

    def test_returns_C_at_50(self):
        assert score_to_grade(50) == "C"

    def test_returns_D_at_49(self):
        assert score_to_grade(49) == "D"

    def test_returns_D_at_0(self):
        assert score_to_grade(0) == "D"


# ---------------------------------------------------------------------------
# compute_kpi_score
# ---------------------------------------------------------------------------


class TestComputeKpiScore:
    # --- milestone type ---

    def test_milestone_achieved_returns_100(self):
        assert compute_kpi_score(1, 1, "higher_is_better", "milestone") == 100

    def test_milestone_exceeded_returns_100(self):
        assert compute_kpi_score(2, 1, "higher_is_better", "milestone") == 100

    def test_milestone_not_achieved_returns_0(self):
        assert compute_kpi_score(0, 1, "higher_is_better", "milestone") == 0

    def test_milestone_ignores_numeric_gap(self):
        # Large gap should still be binary
        assert compute_kpi_score(0.99, 1, "higher_is_better", "milestone") == 0

    # --- numerical, exact boundary: 100% achievement → score 70 ---

    def test_exact_target_returns_70(self):
        assert compute_kpi_score(100, 100, "higher_is_better", "numerical") == pytest.approx(70.0)

    # --- numerical, over-achievement boundary: ≥110% → score 100 ---

    def test_over_achievement_threshold_returns_100(self):
        assert compute_kpi_score(110, 100, "higher_is_better", "numerical") == pytest.approx(100.0)

    def test_above_over_achievement_threshold_capped_at_100(self):
        assert compute_kpi_score(200, 100, "higher_is_better", "numerical") == pytest.approx(100.0)

    # --- numerical, 100%-110% interpolation band ---

    def test_midpoint_of_upper_band_returns_85(self):
        # 105% achievement → midpoint of 100-110% band → score = 70 + 0.5*30 = 85
        assert compute_kpi_score(105, 100, "higher_is_better", "numerical") == pytest.approx(85.0)

    # --- numerical, 70%-100% interpolation band ---

    def test_70_percent_achievement_returns_0(self):
        assert compute_kpi_score(70, 100, "higher_is_better", "numerical") == pytest.approx(0.0)

    def test_below_70_percent_returns_0(self):
        assert compute_kpi_score(50, 100, "higher_is_better", "numerical") == pytest.approx(0.0)

    def test_midpoint_of_lower_band_returns_35(self):
        # 85% achievement → midpoint of 70-100% band → score = (0.15/0.30)*70 = 35
        assert compute_kpi_score(85, 100, "higher_is_better", "numerical") == pytest.approx(35.0)

    # --- lower_is_better polarity ---

    def test_lower_is_better_exact_target_returns_70(self):
        # result == target → achievement_ratio = target/result = 1.0 → score 70
        assert compute_kpi_score(100, 100, "lower_is_better", "numerical") == pytest.approx(70.0)

    def test_lower_is_better_beats_target_scores_higher(self):
        # result = 90, target = 100 → achievement_ratio = 100/90 ≈ 1.111 → ≥ 1.10 → score 100
        assert compute_kpi_score(90, 100, "lower_is_better", "numerical") == pytest.approx(100.0)

    def test_lower_is_better_misses_target_scores_lower(self):
        # result = 130, target = 100 → achievement_ratio = 100/130 ≈ 0.769
        # score = (0.769 - 0.7) / 0.3 * 70 ≈ 16.07
        ratio = 100 / 130
        expected = (ratio - 0.7) / 0.3 * 70
        assert compute_kpi_score(130, 100, "lower_is_better", "numerical") == pytest.approx(expected, rel=1e-5)


# ---------------------------------------------------------------------------
# compute_department_score
# ---------------------------------------------------------------------------


class TestComputeDepartmentScore:
    def test_equal_weights_returns_simple_average(self):
        # (80 * 0.5) + (60 * 0.5) = 70
        assert compute_department_score([(80, 0.5), (60, 0.5)]) == pytest.approx(70.0)

    def test_single_kpi_returns_its_score(self):
        assert compute_department_score([(55, 1.0)]) == pytest.approx(55.0)

    def test_unequal_weights_weighted_correctly(self):
        # (100 * 0.8) + (0 * 0.2) = 80
        assert compute_department_score([(100, 0.8), (0, 0.2)]) == pytest.approx(80.0)

    def test_three_kpis_weighted_average(self):
        # (90*0.5) + (60*0.3) + (30*0.2) = 45+18+6 = 69
        result = compute_department_score([(90, 0.5), (60, 0.3), (30, 0.2)])
        assert result == pytest.approx(69.0)


# ---------------------------------------------------------------------------
# compute_status
# ---------------------------------------------------------------------------
#
# Tolerance defines the at-risk band around the target:
#   higher_is_better:
#     on_track  : result >= target * (1 - tolerance)  AND result >= target * (1 - 2*tolerance) ... hmm
#
# The spec says "on_track", "at_risk", "off_track".
# Using a symmetric tolerance band around the target:
#   on_track  : achievement_ratio >= (1 - tolerance)
#   at_risk   : (1 - 2*tolerance) <= achievement_ratio < (1 - tolerance)
#   off_track : achievement_ratio < (1 - 2*tolerance)
#
# Expected values derived from worked examples, not re-computed from the same formula.


class TestComputeStatus:
    # --- higher_is_better ---

    def test_on_track_exactly_at_target(self):
        assert compute_status(100, 100, "higher_is_better", 0.10) == "on_track"

    def test_on_track_above_target(self):
        assert compute_status(110, 100, "higher_is_better", 0.10) == "on_track"

    def test_on_track_at_lower_boundary(self):
        # 90% of target with 10% tolerance → exactly at on_track boundary
        assert compute_status(90, 100, "higher_is_better", 0.10) == "on_track"

    def test_at_risk_just_below_on_track_boundary(self):
        # 89% of target with 10% tolerance → below on_track, above off_track
        assert compute_status(89, 100, "higher_is_better", 0.10) == "at_risk"

    def test_at_risk_at_off_track_boundary(self):
        # 80% of target with 10% tolerance → exactly at off_track boundary
        assert compute_status(80, 100, "higher_is_better", 0.10) == "at_risk"

    def test_off_track_below_off_track_boundary(self):
        # 79% of target with 10% tolerance → off_track
        assert compute_status(79, 100, "higher_is_better", 0.10) == "off_track"

    def test_off_track_well_below_target(self):
        assert compute_status(50, 100, "higher_is_better", 0.10) == "off_track"

    # --- lower_is_better ---

    def test_lower_is_better_on_track_at_target(self):
        assert compute_status(100, 100, "lower_is_better", 0.10) == "on_track"

    def test_lower_is_better_on_track_below_target(self):
        # result < target → beating the goal → on_track
        assert compute_status(90, 100, "lower_is_better", 0.10) == "on_track"

    def test_lower_is_better_at_risk_exceeds_target_beyond_tolerance(self):
        # result = 115, target = 100 → achievement_ratio = 100/115 ≈ 0.870 → at_risk (0.80 ≤ ratio < 0.90)
        assert compute_status(115, 100, "lower_is_better", 0.10) == "at_risk"

    def test_lower_is_better_off_track_far_above_target(self):
        # result = 130, target = 100 → achievement_ratio = 100/130 ≈ 0.769 → off_track
        assert compute_status(130, 100, "lower_is_better", 0.10) == "off_track"


# ---------------------------------------------------------------------------
# compute_variance
# ---------------------------------------------------------------------------
#
# Variance is signed so that positive always means "favorable" — beating
# target — regardless of polarity.


class TestComputeVariance:
    def test_higher_is_better_beats_target_is_positive(self):
        assert compute_variance(110, 100, "higher_is_better") == pytest.approx(10.0)

    def test_higher_is_better_misses_target_is_negative(self):
        assert compute_variance(90, 100, "higher_is_better") == pytest.approx(-10.0)

    def test_higher_is_better_exact_target_is_zero(self):
        assert compute_variance(100, 100, "higher_is_better") == pytest.approx(0.0)

    def test_lower_is_better_beats_target_is_positive(self):
        # result below target is favorable for a lower-is-better KPI
        assert compute_variance(90, 100, "lower_is_better") == pytest.approx(10.0)

    def test_lower_is_better_misses_target_is_negative(self):
        assert compute_variance(115, 100, "lower_is_better") == pytest.approx(-15.0)

    def test_lower_is_better_exact_target_is_zero(self):
        assert compute_variance(100, 100, "lower_is_better") == pytest.approx(0.0)
