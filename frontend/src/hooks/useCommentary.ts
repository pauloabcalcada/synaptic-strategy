import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface CommentaryData {
  period: string
  content: string | null
  is_ai_generated: boolean
  author_id: string | null
}

interface UseCommentaryResult {
  data: CommentaryData | null
  loading: boolean
  error: unknown
  save: (content: string, authorId: string) => Promise<void>
}

export function useCommentary(code: string, period?: string): UseCommentaryResult {
  const [data, setData] = useState<CommentaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!period) {
      return
    }

    setLoading(true)
    setError(null)

    api
      .get<CommentaryData>(`/api/indicators/${code}/commentary`, {
        params: { period },
      })
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [code, period])

  async function save(content: string, authorId: string): Promise<void> {
    if (!period) {
      return
    }
    const response = await api.put<CommentaryData>(`/api/indicators/${code}/commentary`, {
      period,
      content,
      author_id: authorId,
    })
    setData(response.data)
  }

  return { data, loading, error, save }
}
