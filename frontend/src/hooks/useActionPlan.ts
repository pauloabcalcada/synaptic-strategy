import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface ActionPlanAction {
  action: string
  responsible: string
  deadline_type: 'short_term' | 'mid_term' | 'long_term'
}

export interface ActionPlanContent {
  probable_causes: string[]
  actions: ActionPlanAction[]
  monitoring_suggestion: string
}

export interface ActionPlanData {
  period: string
  content: ActionPlanContent | null
  author_id: string | null
}

interface UseActionPlanResult {
  data: ActionPlanData | null
  draft: ActionPlanContent | null
  loading: boolean
  error: unknown
  generate: () => Promise<void>
  save: (content: ActionPlanContent, authorId: string) => Promise<void>
}

export function useActionPlan(code: string, period?: string): UseActionPlanResult {
  const [data, setData] = useState<ActionPlanData | null>(null)
  const [draft, setDraft] = useState<ActionPlanContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!period) {
      return
    }

    setLoading(true)
    setError(null)

    api
      .get<ActionPlanData>(`/api/indicators/${code}/action-plan`, {
        params: { period },
      })
      .then((response) => setData(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [code, period])

  async function generate(): Promise<void> {
    if (!period) {
      return
    }
    const response = await api.post<ActionPlanContent>('/api/ai/generate-action-plan', {
      code,
      period,
    })
    setDraft(response.data)
  }

  async function save(content: ActionPlanContent, authorId: string): Promise<void> {
    if (!period) {
      return
    }
    const response = await api.put<ActionPlanData>(`/api/indicators/${code}/action-plan`, {
      period,
      content,
      author_id: authorId,
    })
    setData(response.data)
  }

  return { data, draft, loading, error, generate, save }
}
