export interface InfoText {
  title: string
  body: string
  mode: 'tooltip' | 'slideover'
}

export const infoTexts = {
  scoreFormula: {
    title: 'Department score formula',
    body: 'The department score is the weighted average of each KPI’s score, weighted by the KPI’s configured contribution to the department.',
    mode: 'tooltip',
  },
  gradeBrackets: {
    title: 'Grade brackets',
    body: 'A score of 85 or higher is graded A, 70–84 is B, 50–69 is C, and below 50 is D.',
    mode: 'tooltip',
  },
  statusThresholds: {
    title: 'KPI status thresholds',
    body: 'A KPI is on track when its result is within 10% of target, at risk just outside that band, and off track well outside it.',
    mode: 'tooltip',
  },
  momTrend: {
    title: 'Month-over-month trend',
    body: 'The MoM figure is the change in score (or result) versus the prior month; a rising arrow means improvement, a falling arrow means decline.',
    mode: 'tooltip',
  },
  chartReadingGuide: {
    title: 'Reading the trend chart',
    body: 'The sparkline shows the KPI’s recent history at a glance — read it left to right as oldest to most recent period.',
    mode: 'tooltip',
  },
  calculationMethod: {
    title: 'Calculation method',
    body: 'Describes how the raw result for this indicator is derived from its underlying data sources.',
    mode: 'tooltip',
  },
  composition: {
    title: 'Composition',
    body: 'Lists the components that are combined to produce this indicator’s result.',
    mode: 'tooltip',
  },
  polarity: {
    title: 'Polarity',
    body: 'Whether a higher result is better ("higher is better") or a lower result is better ("lower is better") for this indicator.',
    mode: 'tooltip',
  },
  accumulationType: {
    title: 'Accumulation type',
    body: 'How monthly values roll up over the period: the last value, an average, or a running sum.',
    mode: 'tooltip',
  },
  scoreCurve: {
    title: 'How the KPI score is calculated',
    body:
      'For numerical KPIs, the score is based on the achievement ratio (result ÷ target). ' +
      'From 70% to 100% achievement, the score rises linearly from 0 to 70. ' +
      'From 100% to 110% achievement, the score rises linearly from 70 to 100, capping at 100 beyond roughly 110% ' +
      '(so 90% achievement scores about 47, and 80% achievement scores about 23). ' +
      'Milestone KPIs are binary: 100 if met, 0 if not. ' +
      'Status uses a 10% tolerance band around target, and grades are A (≥85), B (≥70), C (≥50), D (below 50).',
    mode: 'slideover',
  },
  commentaryPanel: {
    title: 'Commentary',
    body: 'A manager can record a note about this indicator for the viewed period. Notes are per period and can be edited at any time.',
    mode: 'tooltip',
  },
  graphEdgeDirection: {
    title: 'Reading directed edges',
    body: 'An arrow points from an upstream (cause) KPI to the downstream (effect) KPI it influences. Nodes are grouped into department columns, so it is the arrow itself — not left-right position — that shows which KPI drives which.',
    mode: 'tooltip',
  },
  graphNodeEncoding: {
    title: 'Node encoding',
    body: 'Node border color shows the owning department, matching its column. Node fill intensity shows the KPI’s current department grade (A–D) — a deeper fill means a higher grade. Node size scales with the KPI’s weight — its contribution to its department’s score.',
    mode: 'tooltip',
  },
  graphRelationshipLabels: {
    title: 'Relationship labels',
    body: 'Each edge is labeled with the kind of causal relationship it represents, such as "drives", "enables", or "impacts", describing how the upstream KPI affects the downstream one.',
    mode: 'tooltip',
  },
  executiveScoreAggregation: {
    title: 'Score aggregation',
    body: 'Each area card shows its current department score and grade, taken directly from the latest pre-computed department score — not recalculated on the fly — plus the change versus the prior month.',
    mode: 'tooltip',
  },
  executiveHeatmapLegend: {
    title: 'Heatmap legend',
    body: 'Each row is an area and each column a month. Cell color reflects the grade for that period: green for A, blue for B, amber for C, and red for D. A blank cell means no score was recorded for that period.',
    mode: 'tooltip',
  },
  executivePillarGrouping: {
    title: 'Pillar grouping',
    body: 'Areas roll up into strategic pillars. A pillar’s grade is the average of its member areas’ current scores, banded using the same grade brackets as an individual area.',
    mode: 'tooltip',
  },
} as const

export type InfoTextKey = keyof typeof infoTexts
