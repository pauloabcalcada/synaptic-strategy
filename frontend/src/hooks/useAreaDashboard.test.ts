import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@/lib/api'
import { useAreaDashboard } from './useAreaDashboard'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

const DASHBOARD_RESPONSE = {
  period: '2024-12-01',
  score: 86.4,
  grade: 'A',
  score_mom_delta: -3.2,
  kpis: [
    {
      code: 'FIN_OCR',
      name: 'Operating Cost Ratio',
      unit: 'percentage',
      result: 60.1,
      target: 62.0,
      kpi_score: 82.5,
      status: 'on_track',
      mom_trend: 1.2,
      sparkline: [70, 75, 80, 82.5],
      weight: 0.3,
      variance: 1.9,
    },
  ],
}

beforeEach(() => {
  mockedGet.mockReset()
})

describe('useAreaDashboard', () => {
  it('fetches the area dashboard payload for the given area id', async () => {
    mockedGet.mockResolvedValueOnce({ data: DASHBOARD_RESPONSE })

    const { result } = renderHook(() => useAreaDashboard('area-1'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith('/api/areas/area-1/dashboard', {
      params: {},
    })
    expect(result.current.data).toEqual(DASHBOARD_RESPONSE)
    expect(result.current.error).toBeNull()
  })

  it('exposes the error and clears loading when the request fails', async () => {
    const requestError = new Error('Network Error')
    mockedGet.mockRejectedValueOnce(requestError)

    const { result } = renderHook(() => useAreaDashboard('area-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(requestError)
    expect(result.current.data).toBeNull()
  })
})
