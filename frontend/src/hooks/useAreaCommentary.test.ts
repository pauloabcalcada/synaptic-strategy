import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { api } from '@/lib/api'
import { useAreaCommentary } from './useAreaCommentary'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)
const mockedPut = vi.mocked(api.put)

const COMMENTARY_RESPONSE = {
  period: '2024-12-01',
  content: 'Strong month across the board.',
  is_ai_generated: false,
  author_id: 'manager',
}

const AREA_ID = 'area-123'

beforeEach(() => {
  mockedGet.mockReset()
  mockedPut.mockReset()
})

describe('useAreaCommentary', () => {
  it('fetches the commentary for the given area and period', async () => {
    mockedGet.mockResolvedValueOnce({ data: COMMENTARY_RESPONSE })

    const { result } = renderHook(() => useAreaCommentary(AREA_ID, '2024-12-01'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith(`/api/areas/${AREA_ID}/commentary`, {
      params: { period: '2024-12-01' },
    })
    expect(result.current.data).toEqual(COMMENTARY_RESPONSE)
  })

  it('saves the commentary via PUT and reflects the update in data', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { ...COMMENTARY_RESPONSE, content: null, author_id: null },
    })
    const updated = { ...COMMENTARY_RESPONSE, content: 'Revised note.' }
    mockedPut.mockResolvedValueOnce({ data: updated })

    const { result } = renderHook(() => useAreaCommentary(AREA_ID, '2024-12-01'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save('Revised note.', 'manager')
    })

    expect(mockedPut).toHaveBeenCalledWith(`/api/areas/${AREA_ID}/commentary`, {
      period: '2024-12-01',
      content: 'Revised note.',
      author_id: 'manager',
    })
    expect(result.current.data).toEqual(updated)
  })
})
