import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@/lib/api'
import { useAreaAiSummary } from './useAreaAiSummary'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

const AREA_ID = 'area-123'

const SUMMARY_RESPONSE = {
  period: '2024-12-01',
  summary: {
    indicator_code: 'FIN_OCR',
    indicator_name: 'Operating Cost Ratio',
    pattern: 'sudden_drop',
    confidence: 'medium',
    description: 'A sharp single-period dip.',
    suggested_focus: 'Review what changed in the dip period.',
  },
}

beforeEach(() => {
  mockedGet.mockReset()
})

describe('useAreaAiSummary', () => {
  it('fetches the AI summary for the given area and period', async () => {
    mockedGet.mockResolvedValueOnce({ data: SUMMARY_RESPONSE })

    const { result } = renderHook(() => useAreaAiSummary(AREA_ID, '2024-12-01'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith(`/api/areas/${AREA_ID}/ai-summary`, {
      params: { period: '2024-12-01' },
    })
    expect(result.current.data).toEqual(SUMMARY_RESPONSE)
  })

  it('does not fetch until a period is provided', () => {
    renderHook(() => useAreaAiSummary(AREA_ID, undefined))

    expect(mockedGet).not.toHaveBeenCalled()
  })
})
