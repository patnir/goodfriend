'use client'

import { useEffect, useState } from 'react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  messageType?: string
  choices?: string[]
  selectedChoice?: number
  step: number
  order: number
  createdAt: string
}

type Conversation = {
  id: string
  category: string
  currentStep: number
  totalSteps: number
  isComplete: boolean
  messages: Message[]
}

interface ChatInterfaceProps {
  category: string
}

export default function ChatInterface({ category }: ChatInterfaceProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start conversation on component mount
  useEffect(() => {
    startConversation()
  }, [category]) // eslint-disable-line react-hooks/exhaustive-deps

  const startConversation = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error Response:', data)
        setError(`${data.message || data.error || 'Unknown error'} (Code: ${data.code || 'N/A'})`)
        return
      }

      setConversation(data.conversation)
    } catch (error) {
      console.error('Failed to start conversation:', error)
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const sendMessage = async (message?: string, selectedChoice?: number) => {
    if (!conversation || loading) return
    if (!message && selectedChoice === undefined) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message,
          selectedChoice,
          conversationId: conversation.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error Response:', data)
        setError(`${data.message || data.error || 'Unknown error'} (Code: ${data.code || 'N/A'})`)
        return
      }

      setConversation(data.conversation)
      setInput('')
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage(input.trim())
    }
  }

  const handleChoiceSelect = (choiceIndex: number, choice: string) => {
    sendMessage(choice, choiceIndex)
  }

  const startNewConversation = () => {
    setConversation(null)
    setInput('')
    setError(null)
    startConversation()
  }

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic*
      .split('\n').map((line, i) => (
        <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
      ))
  }

  if (loading && !conversation && !error) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (error && !conversation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={startConversation}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="p-4 border-b bg-white">
        {conversation && (
          <div className="flex justify-center">
            <div className="flex items-center space-x-1">
              {Array.from({ length: conversation.totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < conversation.currentStep ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation?.messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs sm:max-w-md p-3 rounded-lg ${message.role === 'user'
              ? 'bg-blue-500 text-white ml-12'
              : 'bg-gray-100 mr-12'
              }`}>
              <div className="text-sm whitespace-pre-line">
                {formatMessage(message.content)}
              </div>

              {/* Choice buttons for AI messages with choices */}
              {message.messageType === 'choices' && message.choices && (
                <div className="mt-3 space-y-2">
                  {message.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoiceSelect(index, choice)}
                      disabled={loading}
                      className="w-full p-2 text-left text-sm border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {index + 1}. {choice}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg mr-12">
              <p className="text-sm text-gray-500">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input or Completion */}
      <div className="p-4 border-t bg-white">
        {conversation?.isComplete ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">Conversation complete!</p>
            <button
              onClick={startNewConversation}
              className="w-full p-3 bg-blue-500 text-white rounded-lg"
            >
              Start New Session
            </button>
          </div>
        ) : (
          // Only show text input if the last AI message doesn't have choices
          (() => {
            const lastAIMessage = conversation?.messages
              .filter(m => m.role === 'assistant')
              .pop()
            const hasActiveChoices = lastAIMessage?.messageType === 'choices' && (lastAIMessage.choices?.length ?? 0) > 0

            return hasActiveChoices ? (
              <div className="text-center">
                <p className="text-gray-500 text-sm">Please select one of the options above</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your response..."
                  disabled={loading}
                  className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            )
          })()
        )}
      </div>
    </div>
  )
}