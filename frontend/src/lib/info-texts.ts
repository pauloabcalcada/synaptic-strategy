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
} as const

export type InfoTextKey = keyof typeof infoTexts
