import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface AreaAiSummaryContent {
  indicator_code: string
  indicator_name: string
  pattern: 'sudden_drop' | 'gradual_deterioration' | 'seasonal' | 'persistent'
  confidence: 'high' | 'medium' | 'low'
  description: string
  suggested_focus: string
}

export interface AreaAiSummaryData {
  period: string
  summary: AreaAiSummaryContent | null
}

interface UseAreaAiSummaryResult {
  data: AreaAiSummaryData | null
  loading: boolean
  error: unknown
}

export function useAreaAiSummary(areaId: string, period?: string): UseAreaAiSummaryResult {
  const [data, setData] = useState<AreaAiSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!period) {
      return
    }

    setLoading(true)
    setError(null)

    api
      .get<AreaAiSummaryData>(`/api/areas/${areaId}/ai-summary`, {
        params: { period },
      })
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [areaId, period])

  return { data, loading, error }
}
