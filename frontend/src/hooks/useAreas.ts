import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type KpiStatus = 'on_track' | 'at_risk' | 'off_track'

export interface AreaSummary {
  id: string
  name: string
  pillar: string
  score: number
  grade: string
  kpi_count: number
  status_breakdown: Partial<Record<KpiStatus, number>>
}

interface UseAreasResult {
  areas: AreaSummary[] | null
  loading: boolean
  error: unknown
}

export function useAreas(enabled = true): UseAreasResult {
  const [areas, setAreas] = useState<AreaSummary[] | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    setLoading(true)
    setError(null)

    api
      .get<AreaSummary[]>('/api/areas')
      .then((response) => setAreas(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [enabled])

  return { areas, loading, error }
}
