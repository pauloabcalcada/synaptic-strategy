"""Builds discussion/decisions/action-items/next-steps text for a meeting-minutes
PDF, grounded in the actual result numbers for that area/period rather than
generic status-only boilerplate.
"""

from __future__ import annotations


def _gap_percent(result: dict) -> tuple[float, str]:
    gap_ratio = abs(result["result_raw"] - result["target_raw"]) / result["target_raw"]
    direction = "above" if result["result_raw"] > result["target_raw"] else "below"
    return gap_ratio, f"{gap_ratio * 100:.1f}% {direction} target"


def _trend_suffix(result: dict, previous_results: dict[str, str] | None) -> str:
    if not previous_results or result["code"] not in previous_results:
        return ""
    previous = previous_results[result["code"]]
    return f", versus {previous} last month"


def build_narrative(
    area_name: str,
    indicator_results: list[dict],
    previous_results: dict[str, str] | None = None,
) -> dict[str, list[str]]:
    off_track = [r for r in indicator_results if r["status"] == "off_track"]
    at_risk = [r for r in indicator_results if r["status"] == "at_risk"]
    on_track = [r for r in indicator_results if r["status"] == "on_track"]

    discussion: list[str] = []
    decisions: list[str] = []
    action_items: list[str] = []
    watch_list: list[str] = []

    for result in off_track:
        _, gap_text = _gap_percent(result)
        trend = _trend_suffix(result, previous_results)
        discussion.append(
            f"{result['name']} came in at {result['result']} against a {result['target']} target "
            f"— {gap_text}{trend}."
        )
        decisions.append(
            f"Escalate a remediation plan for {result['name']} to {area_name} leadership given the {gap_text}."
        )
        action_items.append(
            f"Owner to deliver a recovery plan for {result['name']} (currently {result['result']}) "
            "before the next review."
        )
        watch_list.append(result["name"])

    for result in at_risk:
        _, gap_text = _gap_percent(result)
        trend = _trend_suffix(result, previous_results)
        discussion.append(
            f"{result['name']} is trending at risk at {result['result']} versus a {result['target']} "
            f"target ({gap_text}{trend})."
        )
        decisions.append(
            f"Monitor {result['name']} weekly until it returns within {result['target']}."
        )
        action_items.append(
            f"Owner to report {result['name']} progress ({result['result']} today) at the next review."
        )
        watch_list.append(result["name"])

    if not off_track and not at_risk and on_track:
        anchor = on_track[0]
        discussion.append(
            f"All reviewed indicators are on track; {anchor['name']} led the group at {anchor['result']} "
            f"against a {anchor['target']} target."
        )
        decisions.append(f"Sustain the current {area_name} execution plan; no corrective action required.")
        action_items.append("No new action items; continue routine monitoring.")

    next_steps_focus = f", with focus on {', '.join(watch_list)}" if watch_list else ""
    next_steps = [f"Reconvene next month to review {area_name} KPI progress{next_steps_focus}."]

    return {
        "discussion_highlights": discussion,
        "decisions": decisions,
        "action_items": action_items,
        "next_steps": next_steps,
    }
