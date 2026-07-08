import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@/lib/api'
import { useExecutiveOverview } from './useExecutiveOverview'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

const OVERVIEW_RESPONSE = {
  areas: [
    {
      area_id: 'area-1',
      name: 'Finance',
      pillar: 'Revenue Growth',
      score: 86.4,
      grade: 'A',
      score_mom_delta: -3.2,
    },
  ],
  pillars: [
    {
      name: 'Revenue Growth',
      areas: ['Finance', 'Sales'],
      rollup_grade: 'B',
      rollup_score: 78.1,
    },
  ],
  heatmap: [
    {
      area_id: 'area-1',
      name: 'Finance',
      cells: [{ period: '2024-12-01', grade: 'A', score: 86.4 }],
    },
  ],
}

beforeEach(() => {
  mockedGet.mockReset()
})

describe('useExecutiveOverview', () => {
  it('fetches the executive overview payload', async () => {
    mockedGet.mockResolvedValueOnce({ data: OVERVIEW_RESPONSE })

    const { result } = renderHook(() => useExecutiveOverview())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith('/api/executive/overview')
    expect(result.current.data).toEqual(OVERVIEW_RESPONSE)
    expect(result.current.error).toBeNull()
  })

  it('exposes the error and clears loading when the request fails', async () => {
    const requestError = new Error('Network Error')
    mockedGet.mockRejectedValueOnce(requestError)

    const { result } = renderHook(() => useExecutiveOverview())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(requestError)
    expect(result.current.data).toBeNull()
  })
})
