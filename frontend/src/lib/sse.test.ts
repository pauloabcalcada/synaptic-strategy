import { describe, expect, it } from 'vitest'
import { readSSEStream } from './sse'

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

describe('readSSEStream', () => {
  it('yields the text carried by each SSE frame, assembled across chunk boundaries', async () => {
    const response = new Response(
      streamFromChunks(['data: Hello \n\ndata: wor', 'ld\n\n'])
    )

    const pieces: string[] = []
    for await (const piece of readSSEStream(response)) {
      pieces.push(piece)
    }

    expect(pieces).toEqual(['Hello ', 'world'])
    expect(pieces.join('')).toBe('Hello world')
  })
})
