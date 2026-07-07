import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@/lib/api'
import { useAreas } from './useAreas'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

const AREAS_RESPONSE = [
  { id: 'area-1', name: 'Sales', pillar: 'Growth', score: 82.3, grade: 'B' },
  { id: 'area-2', name: 'Support', pillar: 'Ops', score: 91.0, grade: 'A' },
]

beforeEach(() => {
  mockedGet.mockReset()
})

describe('useAreas', () => {
  it('fetches the list of areas', async () => {
    mockedGet.mockResolvedValueOnce({ data: AREAS_RESPONSE })

    const { result } = renderHook(() => useAreas())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith('/api/areas')
    expect(result.current.areas).toEqual(AREAS_RESPONSE)
    expect(result.current.error).toBeNull()
  })

  it('exposes the error and clears loading when the request fails', async () => {
    const requestError = new Error('Network Error')
    mockedGet.mockRejectedValueOnce(requestError)

    const { result } = renderHook(() => useAreas())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(requestError)
    expect(result.current.areas).toBeNull()
  })

  it('skips the request when disabled', () => {
    const { result } = renderHook(() => useAreas(false))

    expect(result.current.loading).toBe(false)
    expect(mockedGet).not.toHaveBeenCalled()
  })
})
