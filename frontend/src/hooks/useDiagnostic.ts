import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface DiagnosticData {
  pattern: 'sudden_drop' | 'gradual_deterioration' | 'seasonal' | 'persistent'
  confidence: 'high' | 'medium' | 'low'
  description: string
  suggested_focus: string
}

interface UseDiagnosticResult {
  data: DiagnosticData | null
  loading: boolean
  error: unknown
}

export function useDiagnostic(code: string, period?: string): UseDiagnosticResult {
  const [data, setData] = useState<DiagnosticData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!period) {
      return
    }

    setLoading(true)
    setError(null)

    api
      .post<DiagnosticData | null>('/api/ai/diagnose-deviation', { code, period })
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [code, period])

  return { data, loading, error }
}
