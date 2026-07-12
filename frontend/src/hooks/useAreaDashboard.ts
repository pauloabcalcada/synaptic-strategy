import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface AreaDashboardKpi {
  code: string
  name: string
  unit: string
  result: number
  target: number
  kpi_score: number
  status: 'on_track' | 'at_risk' | 'off_track'
  mom_trend: number | null
  sparkline: number[]
  weight: number
  variance: number
}

export interface AreaDashboardData {
  period: string
  score: number
  grade: string
  score_mom_delta: number | null
  kpis: AreaDashboardKpi[]
}

interface UseAreaDashboardResult {
  data: AreaDashboardData | null
  loading: boolean
  error: unknown
}

export function useAreaDashboard(
  areaId: string,
  period?: string
): UseAreaDashboardResult {
  const [data, setData] = useState<AreaDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    api
      .get<AreaDashboardData>(`/api/areas/${areaId}/dashboard`, {
        params: period ? { period } : {},
      })
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [areaId, period])

  return { data, loading, error }
}
