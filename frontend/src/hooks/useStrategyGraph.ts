import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface StrategyGraphNode {
  id: string
  label: string
  department: string
  score: number
  grade: string
  weight: number
  result: number
  target: number
  active_diagnostic: boolean
}

export interface StrategyGraphEdge {
  source: string
  target: string
  label: string
}

export interface StrategyGraphData {
  nodes: StrategyGraphNode[]
  edges: StrategyGraphEdge[]
}

interface UseStrategyGraphResult {
  data: StrategyGraphData | null
  loading: boolean
  error: unknown
}

export function useStrategyGraph(): UseStrategyGraphResult {
  const [data, setData] = useState<StrategyGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    api
      .get<StrategyGraphData>('/api/graph/strategy-map')
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
