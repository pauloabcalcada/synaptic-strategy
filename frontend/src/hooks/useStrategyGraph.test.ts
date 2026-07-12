import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@/lib/api'
import { useStrategyGraph } from './useStrategyGraph'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

const STRATEGY_MAP_RESPONSE = {
  nodes: [
    {
      id: 'FIN_OCR',
      label: 'Operating Cost Ratio',
      department: 'Finance',
      score: 86.4,
      grade: 'A',
      weight: 0.3,
      result: 60.1,
      target: 62.0,
      active_diagnostic: true,
    },
  ],
  edges: [{ source: 'FIN_OCR', target: 'FIN_EBITDA', label: 'impacts' }],
}

beforeEach(() => {
  mockedGet.mockReset()
})

describe('useStrategyGraph', () => {
  it('fetches the strategy map payload', async () => {
    mockedGet.mockResolvedValueOnce({ data: STRATEGY_MAP_RESPONSE })

    const { result } = renderHook(() => useStrategyGraph())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith('/api/graph/strategy-map')
    expect(result.current.data).toEqual(STRATEGY_MAP_RESPONSE)
    expect(result.current.data?.nodes[0].active_diagnostic).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('exposes the error and clears loading when the request fails', async () => {
    const requestError = new Error('Network Error')
    mockedGet.mockRejectedValueOnce(requestError)

    const { result } = renderHook(() => useStrategyGraph())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(requestError)
    expect(result.current.data).toBeNull()
  })
})
