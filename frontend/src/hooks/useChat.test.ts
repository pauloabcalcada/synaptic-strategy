import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useChat } from './useChat'

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('useChat', () => {
  it('sends multi-turn history on each request and streams the assistant reply in progressively', async () => {
    const mockedFetch = vi.mocked(fetch)
    mockedFetch.mockResolvedValueOnce(
      new Response(streamFromChunks(['data: Hello \n\n', 'data: world\n\n']))
    )

    const { result } = renderHook(() => useChat('FIN_OCR', 'manager'))

    await act(async () => {
      await result.current.send('Why did this drop?')
    })

    expect(mockedFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockedFetch.mock.calls[0]
    expect(url).toContain('/api/ai/chat')
    expect(JSON.parse(init?.body as string)).toEqual({
      code: 'FIN_OCR',
      role: 'manager',
      messages: [{ role: 'user', content: 'Why did this drop?' }],
    })

    await waitFor(() => expect(result.current.streaming).toBe(false))

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Why did this drop?' },
      { role: 'assistant', content: 'Hello world' },
    ])
  })

  it('includes prior turns in the messages sent on a follow-up request', async () => {
    const mockedFetch = vi.mocked(fetch)
    mockedFetch.mockResolvedValueOnce(new Response(streamFromChunks(['data: First.\n\n'])))
    mockedFetch.mockResolvedValueOnce(new Response(streamFromChunks(['data: Second.\n\n'])))

    const { result } = renderHook(() => useChat('FIN_OCR', 'manager'))

    await act(async () => {
      await result.current.send('First question')
    })
    await waitFor(() => expect(result.current.streaming).toBe(false))

    await act(async () => {
      await result.current.send('Second question')
    })
    await waitFor(() => expect(result.current.streaming).toBe(false))

    const [, secondInit] = mockedFetch.mock.calls[1]
    expect(JSON.parse(secondInit?.body as string).messages).toEqual([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First.' },
      { role: 'user', content: 'Second question' },
    ])
  })
})
