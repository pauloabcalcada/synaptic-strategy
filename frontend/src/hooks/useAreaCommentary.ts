import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface AreaCommentaryData {
  period: string
  content: string | null
  is_ai_generated: boolean
  author_id: string | null
}

interface UseAreaCommentaryResult {
  data: AreaCommentaryData | null
  loading: boolean
  error: unknown
  save: (content: string, authorId: string) => Promise<void>
}

export function useAreaCommentary(areaId: string, period?: string): UseAreaCommentaryResult {
  const [data, setData] = useState<AreaCommentaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!period) {
      return
    }

    setLoading(true)
    setError(null)

    api
      .get<AreaCommentaryData>(`/api/areas/${areaId}/commentary`, {
        params: { period },
      })
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [areaId, period])

  async function save(content: string, authorId: string): Promise<void> {
    if (!period) {
      return
    }
    const response = await api.put<AreaCommentaryData>(`/api/areas/${areaId}/commentary`, {
      period,
      content,
      author_id: authorId,
    })
    setData(response.data)
  }

  return { data, loading, error, save }
}
