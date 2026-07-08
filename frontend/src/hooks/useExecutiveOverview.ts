import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface ExecutiveOverviewArea {
  area_id: string
  name: string
  pillar: string
  score: number
  grade: string
  score_mom_delta: number | null
}

export interface ExecutiveOverviewPillar {
  name: string
  areas: string[]
  rollup_grade: string
  rollup_score: number
}

export interface ExecutiveOverviewHeatmapCell {
  period: string
  grade: string
  score: number
}

export interface ExecutiveOverviewHeatmapRow {
  area_id: string
  name: string
  cells: ExecutiveOverviewHeatmapCell[]
}

export interface ExecutiveOverviewData {
  areas: ExecutiveOverviewArea[]
  pillars: ExecutiveOverviewPillar[]
  heatmap: ExecutiveOverviewHeatmapRow[]
}

interface UseExecutiveOverviewResult {
  data: ExecutiveOverviewData | null
  loading: boolean
  error: unknown
}

export function useExecutiveOverview(): UseExecutiveOverviewResult {
  const [data, setData] = useState<ExecutiveOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    api
      .get<ExecutiveOverviewData>('/api/executive/overview')
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
