import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface IndicatorHistoryEntry {
  period: string
  result: number
  target: number
  kpi_score: number
  status: 'on_track' | 'at_risk' | 'off_track'
}

export interface IndicatorData {
  name: string
  code: string
  unit: string
  polarity: 'higher_is_better' | 'lower_is_better'
  calculation_method: string
  composition: string
  accumulation_type: 'last' | 'average' | 'sum'
  kpi_type: 'numerical' | 'milestone'
  period: string
  result: number
  target: number
  kpi_score: number
  status: 'on_track' | 'at_risk' | 'off_track'
  history: IndicatorHistoryEntry[]
}

interface UseIndicatorResult {
  data: IndicatorData | null
  loading: boolean
  error: unknown
}

export function useIndicator(code: string, period?: string): UseIndicatorResult {
  const [data, setData] = useState<IndicatorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    api
      .get<IndicatorData>(`/api/indicators/${code}`, {
        params: period ? { period } : {},
      })
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [code, period])

  return { data, loading, error }
}
