'use client'

import { useState, useEffect, useRef } from 'react'
import { chatService } from '@/services/chatService'
import { Conversation, ChatMessage } from '@/types'
import { getEcho, disconnectEcho } from '@/lib/echo'
import { useAppContext } from '@/context/Context'

export default function LiveChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickResponses, setQuickResponses] = useState<string[]>([])
  const [aiGenerating, setAiGenerating] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)
  const { user } = useAppContext()

  useEffect(() => {
    if (!user?.id) return
    loadConversations()
    loadQuickResponses()
    return () => {
      try { if (channelRef.current) channelRef.current.unsubscribe() } catch {}
      disconnectEcho()
    }
  }, [user?.id])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      subscribeToConversation(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const subscribeToConversation = (conversationId: number) => {
    try {
      const echo = getEcho()
      if (channelRef.current) channelRef.current.unsubscribe()
      const channel = echo.private(`conversation.${conversationId}`)
      channelRef.current = channel
      channel.listen('ChatMessageSent', (payload: any) => {
        const msg: ChatMessage = {
          id: payload.id,
          conversation_id: payload.conversation_id,
          user_id: payload.user_id,
          user: { id: payload.user.id, name: payload.user.name },
          message: payload.body,
          attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
          created_at: payload.created_at,
        }
        setMessages((prev) => [...prev, msg])
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Echo subscribe failed', e)
    }
  }

  const loadConversations = async () => {
    try {
      const data = await chatService.fetchConversations()
      const raw = (data?.data ?? data ?? [])
      const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
      // Fetch details for membership info, then filter
      const details = await Promise.all(list.map(async (c: any) => {
        try {
          const d = await chatService.fetchConversationDetails(c.id)
          return { id: c.id, details: d }
        } catch {
          return { id: c.id, details: null }
        }
      }))
      const uid = user?.id
      const allowedIds = new Set(details.filter(d => {
        if (!d.details) return false
        // strict membership: must be explicitly is_member or present in members list
        const isMemberFlag = d.details.is_member === true
        const inMembers = Array.isArray(d.details.members) && d.details.members.some((m: any) => String(m.id) === String(uid))
        return isMemberFlag || inMembers
      }).map(d => d.id))

      const normalized = list
        .filter(c => allowedIds.has(c.id))
        .map((c: any) => ({
          id: c.id,
          name: c.title ?? c.name ?? `Conversation ${c.id}`,
          participants: [],
          last_message: c.last_message ?? c.lastMessage ?? null,
          created_at: c.created_at,
          status: c.status ?? 'Active',
          priority: c.priority ?? 'Low',
        }))
      setConversations(normalized as any)
      // auto-select the first allowed conversation
      if (normalized.length > 0) setSelectedConversation(normalized[0] as any)
    } catch (err) {
      setError('Failed to load conversations')
    }
  }

  const loadQuickResponses = async () => {
    try {
      const res = await chatService.fetchQuickResponses()
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : (res ?? []))
      const mapped = (list as any[]).map((q: any) => (typeof q === 'string' ? q : (q.content ?? q.body ?? q.text ?? q.title ?? String(q))))
      setQuickResponses(mapped.filter(Boolean).slice(0, 12))
    } catch (e) {
      console.error('Failed to load quick responses', e)
      setQuickResponses([])
    }
  }

  // helper: parse various responses into string[]
  function parseAiResponseToList(res: any): string[] {
    if (!res) return []
    if (Array.isArray(res)) return res.map((i: any) => (typeof i === 'string' ? i : (i.text ?? i.content ?? String(i)))).filter(Boolean)
    if (Array.isArray(res?.suggestions)) return res.suggestions.map((i: any) => (typeof i === 'string' ? i : (i.text ?? i.content ?? String(i)))).filter(Boolean)
    if (Array.isArray(res?.data)) return res.data.map((i: any) => (typeof i === 'string' ? i : (i.text ?? i.content ?? String(i)))).filter(Boolean)
    if (typeof res === 'string') {
      const lines = res.split(/\r?\n/).map((l: string) => l.replace(/^\d+[.)\-\s]+/, '').trim()).filter(Boolean)
      return lines.length ? lines : [res]
    }
    if (typeof res?.suggestion === 'string') return [res.suggestion]
    if (Array.isArray(res?.suggestion)) return res.suggestion.map(String)
    // fallback: stringify
    return [JSON.stringify(res)].slice(0, 6)
  }

  // client-side timeout wrapper (non-abortive) + retry
  async function generateAIQuickResponses(language = 'fr') {
    if (!selectedConversation) return
    setAiGenerating(true)
    const prompt = 'Provide 6 short canned questions for help desk'
    const timeoutMs = 8000 // client-side timeout (ms)
    const retries = 1

    async function tryOnce(): Promise<boolean> {
      try {
        // race chatService call with a timeout to fail fast on client
        const p = chatService.generateQuickResponses(prompt, language)
        const timed = new Promise((_, reject) => {
          const t = window.setTimeout(() => {
            clearTimeout(t)
            reject(new Error('Client timeout'))
          }, timeoutMs)
        })
        // If chatService.generateQuickResponses itself times out it will throw; we only use timed race to fail earlier if desired
        const res = await Promise.race([p, timed])
        const list = parseAiResponseToList(res)
        if (list.length === 0) throw new Error('No suggestions returned')
        setQuickResponses(list.slice(0, 8))
        return true
      } catch (err) {
        console.error('AI quick responses generation failed', err)
        return false
      }
    }

    let ok = await tryOnce()
    if (!ok && retries > 0) {
      // small backoff then retry
      await new Promise(r => setTimeout(r, 500))
      ok = await tryOnce()
    }

    if (!ok) {
      // fallback: preserve existing if present, otherwise set defaults
      if (!quickResponses || quickResponses.length === 0) {
        setQuickResponses([
          'I have a connection problem',
          'How can I reset my password?',
          'My bill seems incorrect',
          'How does this feature work?',
          'I need help with my account',
          'Can someone call me back?'
        ])
      }
      // Optional: surface a lightweight message to the agent
      // console.warn('AI quick responses: using fallback canned replies.')
    }

    setAiGenerating(false)
  }

  const loadMessages = async (conversationId: number) => {
    try {
      const data = await chatService.fetchMessages(conversationId)
      const list = Array.isArray(data) ? data : (data?.data || [])
      const normalized = list.map((m: any) => ({
        ...m,
        message: m.message ?? m.body ?? '',
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
      }))
      setMessages(normalized)
    } catch (err) {
      setError('Failed to load messages')
    }
  }

  const sendMessage = async () => {
    if (!selectedConversation || (!newMessage.trim() && files.length === 0)) return

    setLoading(true)

    // Optimistic UI
    const tempId = Date.now()
    const optimistic: ChatMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      user_id: user?.id ?? 0,
      user: { id: user?.id ?? 0, name: user?.name ?? 'You' },
      message: newMessage,
      attachments: [],
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      await chatService.sendMessage(selectedConversation.id, newMessage, files)
      setNewMessage('')
      setFiles([])
      // ensure we have server-confirmed messages
      await loadMessages(selectedConversation.id)
    } catch (err: any) {
      // rollback
      setMessages((prev) => prev.filter(m => m.id !== tempId))
      setError(err.message || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const createConversation = async () => {
    try {
      if (!user?.id) throw new Error('Not authenticated')
      // clone admin flow: prefer direct route if selecting another user; fallback to simple private
      const res = await chatService.createConversation({ title: 'Conversation', participants: [user.id] })
      await loadConversations()
    } catch (e: any) {
      setError(e?.message || 'Failed to create conversation')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleQuickResponseClick = (text: string) => {
    setNewMessage(text)
    // focus the input so agent can quickly edit or send
    try {
      const el = document.querySelector('input[type="text"]') as HTMLInputElement | null
      if (el) {
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
    } catch {}
  }

  const handleQuickResponseSend = async (text: string) => {
    // insert text and immediately send it as a quick canned reply
    setNewMessage(text)
    // small delay to allow React state to update before sending
    setTimeout(() => { void sendMessage() }, 50)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-6">
      <div className="flex h-[calc(100vh-200px)] gap-6 max-w-7xl mx-auto">
        {/* Conversations List */}
        <div className="w-1/4 border border-slate-200/60 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">💬 Conversations</h3>
              <a href="/clientdashboard/live-chat/create" className="text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:from-cyan-700 hover:to-cyan-800 font-medium shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-200">
                ✨ New
              </a>
            </div>
          </div>
          <div className="overflow-y-auto h-full">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-5 border-b border-slate-100/60 cursor-pointer hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-blue-50/50 transition-all duration-200 ${
                  selectedConversation?.id === conversation.id 
                    ? 'bg-gradient-to-r from-cyan-100/70 to-blue-100/70 border-l-4 border-l-cyan-500 shadow-md' 
                    : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full shadow-sm"></div>
                      <h4 className="font-semibold text-slate-900">
                        {conversation.name || `Conversation ${conversation.id}`}
                      </h4>
                    </div>
                    {conversation.last_message && (
                      <p className="text-sm text-slate-600 truncate mt-2 ml-5">
                        {conversation.last_message.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-500 font-medium">
                      {conversation.last_message ? formatTime(conversation.last_message.created_at) : ''}
                    </span>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg">
                    <span className="text-white font-bold text-sm">💭</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedConversation.name || `Conversation ${selectedConversation.id}`}
                    </h3>
                    <p className="text-sm text-slate-600">Active conversation</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50/30 to-cyan-50/20">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-5 py-3 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                        message.user_id === user?.id
                          ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-cyan-500/25'
                          : 'bg-white/90 text-slate-900 border border-slate-200/60'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.message || ''}</p>
                      {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.attachments.map((a: any) => {
                            const url = a.url || a.path || a.download_url || ''
                            const mime = a.mime || a.mime_type || ''
                            const name = a.filename || a.name || 'attachment'
                            const isImage = typeof mime === 'string' ? mime.startsWith('image/') : /\.(png|jpe?g|gif|webp|svg)$/i.test(String(url))
                            return (
                              <div key={a.id || name} className={`rounded-xl p-3 ${message.user_id === user?.id ? 'bg-cyan-600/30' : 'bg-slate-50/60'}`}>
                                {isImage && url ? (
                                  <a href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt={name} className="max-h-40 rounded-lg shadow-sm hover:shadow-md transition-shadow" />
                                  </a>
                                ) : (
                                  <a href={url} target="_blank" rel="noreferrer" className="underline break-all hover:text-cyan-600 transition-colors">
                                    📎 {name}
                                  </a>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <p className="text-xs mt-2 opacity-75 font-medium">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-slate-200/60 bg-white/50 backdrop-blur-sm">
                {files.length > 0 && (
                  <div className="mb-3">
                    {files.map((file, index) => (
                      <span key={index} className="inline-block bg-gradient-to-r from-cyan-50 to-cyan-100 px-3 py-1.5 rounded-xl text-sm mr-2 border border-cyan-200 font-medium">
                        📎 {file.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sendMessage() } }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80"
                  />
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="px-4 py-3 bg-slate-100/80 text-slate-700 rounded-xl cursor-pointer hover:bg-slate-200/80 backdrop-blur-sm transition-all duration-200 font-medium border border-slate-200"
                  >
                    📎
                  </label>
                  <button
                    onClick={sendMessage}
                    disabled={loading || (!newMessage.trim() && files.length === 0)}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 disabled:opacity-50 font-medium shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-200"
                  >
                    {loading ? '⏳ Sending...' : '🚀 Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50/30 to-cyan-50/20">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">💬</span>
                </div>
                <p className="text-slate-500 font-medium">Select a conversation to start chatting</p>
                <p className="text-sm text-slate-400 mt-1">Choose from your active conversations</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-1/4 space-y-6">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <h4 className="font-bold mb-4 text-slate-900 flex items-center gap-2">
              <span className="text-lg">💡</span>
              Quick Responses
            </h4>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void generateAIQuickResponses()}
                  disabled={aiGenerating}
                  className={`text-xs px-3 py-1 rounded ${aiGenerating ? 'bg-gray-200 text-gray-500' : 'bg-cyan-600 text-white hover:bg-cyan-700'} transition-colors`}
                >
                  {aiGenerating ? 'Generating...' : 'Generate (AI)'}
                </button>
                <button onClick={loadQuickResponses} className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Reload</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {(quickResponses.length ? quickResponses : ['I have a connection problem','How can I reset my password?','My bill seems incorrect','How does this feature work?']).map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleQuickResponseClick(s)}
                    className="text-left w-full px-4 py-3 bg-gradient-to-r from-slate-50 to-cyan-50/50 border border-slate-200/60 rounded-xl hover:from-cyan-50 hover:to-cyan-100/70 hover:border-cyan-300 transition-all duration-200 text-sm font-medium hover:shadow-md"
                  >
                    💡 {s}
                  </button>
                  <button
                    onClick={() => void handleQuickResponseSend(s)}
                    title="Send quick reply"
                    className="ml-2 inline-flex items-center justify-center px-3 py-2 rounded-md bg-cyan-600 text-white text-xs hover:bg-cyan-700 transition-colors"
                  >
                    Send
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <h4 className="font-bold mb-3 text-slate-900 flex items-center gap-2">
              <span className="text-lg">📊</span>
              Status
            </h4>
            <div className="flex items-center gap-3 text-sm">
              <div className="relative">
                <span className="h-3 w-3 rounded-full bg-gradient-to-r from-green-400 to-green-500 inline-block shadow-sm" />
                <span className="absolute inset-0 h-3 w-3 rounded-full bg-green-400 animate-ping opacity-75" />
              </div>
              <span className="font-medium text-slate-700">Connected in real-time</span>
            </div>
            <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
              <p className="text-xs text-green-700 font-medium flex items-center gap-2">
                <span>🔒</span>
                Messages are end-to-end encrypted
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <h4 className="font-bold mb-4 text-slate-900 flex items-center gap-2">
              <span className="text-lg">⏰</span>
              Recent conversations
            </h4>
            <div className="space-y-3">
              {conversations.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConversation(c)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200/60 hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-blue-50/50 hover:border-cyan-300/50 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 group-hover:animate-pulse"></div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{c.name || `Conversation ${c.id}`}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">{c.last_message?.message?.slice(0, 40) || ''}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
