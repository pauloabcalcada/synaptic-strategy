import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@/lib/api'
import { useDiagnostic } from './useDiagnostic'

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn() },
}))

const mockedPost = vi.mocked(api.post)

const DIAGNOSTIC_RESPONSE = {
  pattern: 'sudden_drop',
  confidence: 'medium',
  description: 'A sharp single-period dip.',
  suggested_focus: 'Review what changed in that period.',
}

beforeEach(() => {
  mockedPost.mockReset()
})

describe('useDiagnostic', () => {
  it('fetches the diagnostic for the given indicator code and period', async () => {
    mockedPost.mockResolvedValueOnce({ data: DIAGNOSTIC_RESPONSE })

    const { result } = renderHook(() => useDiagnostic('FIN_OCR', '2023-05-01'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedPost).toHaveBeenCalledWith('/api/ai/diagnose-deviation', {
      code: 'FIN_OCR',
      period: '2023-05-01',
    })
    expect(result.current.data).toEqual(DIAGNOSTIC_RESPONSE)
  })

  it('returns null data when the indicator has no diagnostic', async () => {
    mockedPost.mockResolvedValueOnce({ data: null })

    const { result } = renderHook(() => useDiagnostic('FIN_OCR', '2024-12-01'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
  })
})
