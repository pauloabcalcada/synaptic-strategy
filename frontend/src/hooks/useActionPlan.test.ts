import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { api } from '@/lib/api'
import { useActionPlan } from './useActionPlan'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)
const mockedPut = vi.mocked(api.put)
const mockedPost = vi.mocked(api.post)

const SAVED_PLAN = {
  period: '2024-12-01',
  content: {
    probable_causes: ['Vendor cost spike'],
    actions: [
      { action: 'Renegotiate vendor contract', responsible: 'manager', deadline_type: 'short_term' },
    ],
    monitoring_suggestion: 'Review monthly.',
  },
  author_id: 'manager',
}

const GENERATED_DRAFT = {
  probable_causes: ['Sudden drop in throughput'],
  actions: [
    { action: 'Audit the affected process step', responsible: 'area_manager', deadline_type: 'mid_term' },
  ],
  monitoring_suggestion: 'Track weekly until resolved.',
}

beforeEach(() => {
  mockedGet.mockReset()
  mockedPut.mockReset()
  mockedPost.mockReset()
})

describe('useActionPlan', () => {
  it('fetches the saved action plan for the given indicator code and period', async () => {
    mockedGet.mockResolvedValueOnce({ data: SAVED_PLAN })

    const { result } = renderHook(() => useActionPlan('FIN_OCR', '2024-12-01'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith('/api/indicators/FIN_OCR/action-plan', {
      params: { period: '2024-12-01' },
    })
    expect(result.current.data).toEqual(SAVED_PLAN)
  })

  it('generates a draft via POST without persisting it', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { ...SAVED_PLAN, content: null, author_id: null },
    })
    mockedPost.mockResolvedValueOnce({ data: GENERATED_DRAFT })

    const { result } = renderHook(() => useActionPlan('FIN_OCR', '2024-12-01'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.generate()
    })

    expect(mockedPost).toHaveBeenCalledWith('/api/ai/generate-action-plan', {
      code: 'FIN_OCR',
      period: '2024-12-01',
    })
    expect(result.current.draft).toEqual(GENERATED_DRAFT)
    expect(mockedPut).not.toHaveBeenCalled()
  })

  it('saves the action plan via PUT and reflects the update in data', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { ...SAVED_PLAN, content: null, author_id: null },
    })
    mockedPut.mockResolvedValueOnce({ data: SAVED_PLAN })

    const { result } = renderHook(() => useActionPlan('FIN_OCR', '2024-12-01'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save(SAVED_PLAN.content, 'manager')
    })

    expect(mockedPut).toHaveBeenCalledWith('/api/indicators/FIN_OCR/action-plan', {
      period: '2024-12-01',
      content: SAVED_PLAN.content,
      author_id: 'manager',
    })
    expect(result.current.data).toEqual(SAVED_PLAN)
  })
})
