"""Versioned prompt templates for AI features. No prompt strings live inline in routes."""

DIAGNOSTIC_PROMPT_V1 = """\
You are an analyst embedded in a strategy execution platform. Classify the \
deviation pattern for the following KPI and explain it briefly.

Indicator: {indicator_name} ({unit})
Strategic pillar: {pillar_name}
Calculation method: {calculation_method}
Period under review: {period}
Result: {result}
Target: {target}

Last 24 months of results (oldest to newest):
{history}

Classify the deviation as one of: sudden_drop, gradual_deterioration, seasonal, \
persistent. State your confidence as one of: high, medium, low. Respond with a \
JSON object: {{"pattern": ..., "confidence": ..., "description": ..., \
"suggested_focus": ...}}.
"""
