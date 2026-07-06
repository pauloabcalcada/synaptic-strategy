import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@/lib/api'
import { useIndicator } from './useIndicator'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

const INDICATOR_RESPONSE = {
  name: 'Operating Cost Ratio',
  code: 'FIN_OCR',
  unit: 'percentage',
  polarity: 'lower_is_better',
  calculation_method: 'Operating expenses divided by total revenue.',
  composition: 'Payroll + infrastructure + marketing + G&A costs.',
  accumulation_type: 'last',
  kpi_type: 'numerical',
  period: '2024-12-01',
  result: 60.1,
  target: 62.0,
  kpi_score: 82.5,
  status: 'on_track',
  history: [
    { period: '2024-11-01', result: 61.0, target: 62.0, kpi_score: 78.0, status: 'on_track' },
    { period: '2024-12-01', result: 60.1, target: 62.0, kpi_score: 82.5, status: 'on_track' },
  ],
}

beforeEach(() => {
  mockedGet.mockReset()
})

describe('useIndicator', () => {
  it('fetches the indicator detail payload for the given code', async () => {
    mockedGet.mockResolvedValueOnce({ data: INDICATOR_RESPONSE })

    const { result } = renderHook(() => useIndicator('FIN_OCR'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith('/api/indicators/FIN_OCR', {
      params: {},
    })
    expect(result.current.data).toEqual(INDICATOR_RESPONSE)
    expect(result.current.error).toBeNull()
  })

  it('exposes the error and clears loading when the request fails', async () => {
    const requestError = new Error('Network Error')
    mockedGet.mockRejectedValueOnce(requestError)

    const { result } = renderHook(() => useIndicator('FIN_OCR'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(requestError)
    expect(result.current.data).toBeNull()
  })
})
