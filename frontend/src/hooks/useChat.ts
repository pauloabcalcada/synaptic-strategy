import { useState } from 'react'
import { readSSEStream } from '@/lib/sse'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface UseChatResult {
  messages: ChatMessage[]
  streaming: boolean
  send: (content: string) => Promise<void>
}

export function useChat(code: string, role: string): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)

  async function send(content: string): Promise<void> {
    const history = [...messages, { role: 'user', content } as ChatMessage]
    setMessages(history)
    setStreaming(true)

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, role, messages: history }),
    })

    let assistantContent = ''
    setMessages([...history, { role: 'assistant', content: assistantContent }])

    for await (const piece of readSSEStream(response)) {
      assistantContent += piece
      setMessages([...history, { role: 'assistant', content: assistantContent }])
    }

    setStreaming(false)
  }

  return { messages, streaming, send }
}
