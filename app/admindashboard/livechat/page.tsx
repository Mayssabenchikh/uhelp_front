// app/admindashboard/livechat/page.tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Search,
  Phone,
  Video,
  MoreHorizontal,
  Info,
  Paperclip,
  Smile,
  Send,
  Users,
  Star,
  MapPin,
  Clock,
  Plus,
  History,
  AlertCircle,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { chatService } from '@/services/chatService'
import Picker,{ EmojiClickData } from 'emoji-picker-react';

/** TYPES **/
interface AttachmentDTO { id: number | string; url: string; filename: string; mime?: string | null; size?: number | null }
type Sender = 'user' | 'agent'
interface ChatMessage { id: string | number; sender: Sender; content: string; timestamp: string; attachments?: AttachmentDTO[] }
interface Conversation { id: string | number; customer: { name: string; email?: string; avatar?: string | null }; status: 'Active' | 'Waiting' | 'Resolved'; priority: 'High' | 'Medium' | 'Low'; lastMessage?: string; timestamp?: string; unreadCount?: number }
interface QuickResponse { id: number; content: string; title?: string; language?: string | null }
interface ConversationDetails {
  customer: {
    name: string
    email?: string
    avatar?: string | null
    location?: string
    joined?: string
  }
  stats?: {
    totalChats?: number
    satisfaction?: number
  }
}

const mapSender = (role?: string | null): Sender => (role === 'agent' ? 'agent' : 'user')

export default function LiveChatPage() {
  const [selectedTab, setSelectedTab] = useState<'Active' | 'Waiting' | 'Resolved'>('Active')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [quickResponses, setQuickResponses] = useState<QuickResponse[]>([])
  const [loadingConvs, setLoadingConvs] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [aiGenerating, setAiGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
const [showEmojiPicker, setShowEmojiPicker] = useState(false)
const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null)

  const handleEmojiClick = (emojiObject: EmojiClickData, _event: MouseEvent) => {
    setMessage(prev => prev + emojiObject.emoji)
  }
  // Debounce search + reload on tab change
  useEffect(() => {
    const t = setTimeout(() => { void loadConversations() }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, searchTerm])

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      void loadMessages(selectedConversation)
      void loadConversationDetails(selectedConversation)  // <-- Ajouter ici

    } else {
      setMessages([])
      setConversationDetails(null)

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation])

  // Auto-scroll on messages change
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /** Fetch conversations and normalize (clone to avoid frozen Flight objects) */
  async function loadConversations() {
    setLoadingConvs(true)
    try {
      const params = { status: selectedTab, search: searchTerm }
      const res = await chatService.fetchConversations(params)
      const list = Array.isArray(res) ? res : (res.data ?? res.items ?? res)
      const normalized: Conversation[] = (list as any[]).map((c) => ({
        id: c.id,
        customer: { name: c.title ?? c.name ?? 'Sans titre', email: c.email ?? '', avatar: c.avatar ?? null },
        status: (c.status ?? 'Active') as Conversation['status'],
        priority: (c.priority ?? 'Low') as Conversation['priority'],
        lastMessage: c.last_message ?? c.lastMessage ?? c.preview ?? '',
        timestamp: c.updated_at ?? c.created_at ?? c.timestamp ?? '',
        unreadCount: c.unread_count ?? c.unreadCount ?? 0
      }))
      // Set cloned list (no frozen objects referenced)
      setConversations(normalized)
      if (!selectedConversation && normalized.length > 0) setSelectedConversation(String(normalized[0].id))
    } catch (err) {
      console.error('Failed to load conversations', err)
    } finally { setLoadingConvs(false) }
  }

  /** Fetch messages for a conversation and normalize (clone nested objects) */
  async function loadMessages(conversationId: string | number) {
    setLoadingMessages(true)
    try {
      const res = await chatService.fetchMessages(conversationId)
      const list = Array.isArray(res) ? res : (res.data ?? res.messages ?? res)
      const normalized: ChatMessage[] = (list as any[]).map((m) => {
        const role: string | undefined = m.user?.role ?? m.user_role ?? m.role
        const body: string = m.body ?? m.content ?? m.message ?? ''
        return {
          id: m.id,
          sender: mapSender(role),
          content: body,
          timestamp: String(m.created_at ?? m.timestamp ?? m.createdAt ?? ''),
          attachments: (m.attachments ?? m.files ?? []).map((a: any) => ({ id: a.id, url: a.url ?? a.path ?? a.link, filename: a.filename ?? a.original_name ?? a.name, mime: a.mime ?? a.type ?? null, size: a.size ?? a.file_size ?? null }))
        }
      })
      setMessages(normalized)
    } catch (err) {
      console.error('Failed to load messages', err)
      setMessages([])
    } finally { setLoadingMessages(false) }
  }

async function loadConversationDetails(conversationId: string | number) {
  try {
    const data = await chatService.fetchConversationDetails(conversationId)
    setConversationDetails(data)
  } catch (err) {
    console.error('Failed to load conversation details', err)
    setConversationDetails(null)
  }
}

  /** Quick responses load (initial) */
  async function loadQuickResponses() {
    try {
      const res = await chatService.fetchQuickResponses()
      const list = Array.isArray(res) ? res : (res.data ?? res.items ?? res)
      const normalized: QuickResponse[] = (list as any[]).map((q) => ({ id: q.id, content: q.content ?? q.body ?? q.text ?? q.title ?? String(q), title: q.title, language: q.language ?? null }))
      setQuickResponses(normalized)
    } catch (err) {
      console.error('Failed to load quick responses', err)
      setQuickResponses([])
    }
  }

  useEffect(() => { void loadQuickResponses() }, [])

  /** --- NEW: generate quick responses using AI --- **/
  async function generateAIQuickResponses(language: string = 'fr') {
    if (!selectedConversation) return
    setAiGenerating(true)
    try {
      // Build context from last N messages (most recent)
      const N = 8
      const lastMessages = messages.slice(-N)
      const context = lastMessages.map(m => `${m.sender === 'agent' ? 'Agent' : 'Client'}: ${m.content}`).join('\n')

      let finalContext = context
      if (!finalContext || finalContext.trim() === '') {
        const conv = conversations.find(c => String(c.id) === String(selectedConversation))
        finalContext = conv?.lastMessage ? `Client: ${conv.lastMessage}` : 'Client: Bonjour, j’ai un problème...'
      }

      const aiResponse = await chatService.generateQuickResponses(finalContext, language)
      const rawText = (typeof aiResponse === 'string') ? aiResponse : (aiResponse?.suggestion ?? aiResponse?.suggestions ?? JSON.stringify(aiResponse))

      const suggestions = parseAiSuggestions(rawText)
      const generated: QuickResponse[] = suggestions.map((s, i) => ({ id: Date.now() * -1 - i, content: s }))
      setQuickResponses(generated)
    } catch (err) {
      console.error('AI generate quick responses failed', err)
      // Friendly UX message
      // eslint-disable-next-line no-alert
      alert('Erreur: impossible de générer des réponses AI. Vérifie la connexion et les permissions.')
    } finally {
      setAiGenerating(false)
    }
  }

  /** Parse AI raw output into array */
  function parseAiSuggestions(raw: string): string[] {
    if (!raw) return []
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
    const cleaned = lines.map(l => l.replace(/^\d+[\).\s-]+/, '').replace(/^[-*]\s+/, '').trim())
    if (cleaned.length >= 2) return cleaned.slice(0, 6).map(s => (s.length > 180 ? s.slice(0, 177) + '...' : s))
    const sentences = raw.match(/[^.!?]+[.!?]?/g)?.map(s => s.trim()).filter(Boolean) ?? []
    const useful = sentences.slice(0, 6).map(s => s.replace(/^[“"']|[”"']$/g, '').trim()).filter(s => s.length > 3)
    if (useful.length > 0) return useful
    const short = raw.trim()
    return [short.length > 180 ? short.slice(0, 177) + '...' : short]
  }

  /** Send message (supports attachments) */
  async function handleSendMessage() {
    if ((!message.trim() && filesToUpload.length === 0) || !selectedConversation) return
    setSending(true)
    const tempId = `temp-${Date.now()}`
    try {
      const optimistic: ChatMessage = { id: tempId, sender: 'user', content: message, timestamp: new Date().toISOString(), attachments: filesToUpload.map((f, i) => ({ id: i, url: URL.createObjectURL(f), filename: f.name })) }
      setMessages((prev) => [...prev, optimistic])

      const res = await chatService.sendMessage(selectedConversation, message, filesToUpload)
      const payload = (res && (res.message ?? res))
      const serverMsg: ChatMessage = {
        id: payload?.id ?? Date.now(),
        sender: mapSender(payload?.user?.role ?? payload?.user_role ?? payload?.role ?? null),
        content: payload?.body ?? payload?.content ?? message,
        timestamp: String(payload?.created_at ?? payload?.createdAt ?? new Date().toISOString()),
        attachments: (payload?.attachments ?? payload?.files ?? []).map((a: any) => ({ id: a.id, url: a.url ?? a.path ?? a.link, filename: a.filename ?? a.original_name ?? a.name, mime: a.mime ?? null, size: a.size ?? null }))
      }

      setMessages((prev) => { const filtered = prev.filter((m) => String(m.id) !== String(tempId)); return [...filtered, serverMsg] })
      setMessage(''); setFilesToUpload([]); if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err) {
      console.error('send message error', err)
    } finally { setSending(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendMessage() }
  }

  function handleQuickResponseClick(text: string) {
    setMessage(text)
    const ta = document.querySelector('textarea'); if (ta) (ta as HTMLTextAreaElement).focus()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return; const arr = Array.from(e.target.files); setFilesToUpload(arr)
  }

  // client-side filtering
  const filteredConversations = conversations.filter((conv) =>
    conv.status === selectedTab &&
    (conv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conv.customer?.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conv.lastMessage ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
  )
  const currentConversation = conversations.find((c) => String(c.id) === String(selectedConversation))

  return (
    <div className="flex h-[calc(100vh-140px)] bg-gray-100 -m-6">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['Active', 'Waiting', 'Resolved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                selectedTab === tab ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50' : 'text-gray-600 hover:text-gray-800'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs && <div className="p-4 text-center text-sm text-gray-500">Loading...</div>}

          {(!loadingConvs && filteredConversations.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No {selectedTab.toLowerCase()} conversations found</p>
            </div>
          )}

          {filteredConversations.map((conversation) => (
            <div
              key={String(conversation.id)}
              onClick={() => setSelectedConversation(String(conversation.id))}
              className={cn(
                'p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors',
                String(selectedConversation) === String(conversation.id) ? 'bg-blue-50 border-blue-200' : ''
              )}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <img
                    src={conversation.customer.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.customer.name)}`}
                    alt={conversation.customer.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {conversation.status === 'Active' && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{conversation.customer.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', conversation.status === 'Active' ? 'bg-green-100 text-green-800' : conversation.status === 'Waiting' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>
                        {conversation.status}
                      </span>
                      <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', conversation.priority === 'High' ? 'bg-red-100 text-red-800' : conversation.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')}>
                        {conversation.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{conversation.customer.email}</p>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-1">{conversation.lastMessage}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                    {conversation.unreadCount ? <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">{conversation.unreadCount}</span> : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation && currentConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={currentConversation.customer.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentConversation.customer.name)}`} alt={currentConversation.customer.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <h3 className="font-semibold text-gray-900">{currentConversation.customer.name}</h3>
                <p className="text-sm text-gray-600">{currentConversation.customer.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('px-2 py-1 text-xs font-medium rounded-full', currentConversation.status === 'Active' ? 'bg-green-100 text-green-800' : currentConversation.status === 'Waiting' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>
                  ● {currentConversation.status}
                </span>
                <span className={cn('px-2 py-1 text-xs font-medium rounded-full', currentConversation.priority === 'High' ? 'bg-red-100 text-red-800' : currentConversation.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')}>
                  {currentConversation.priority}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"><Phone className="w-5 h-5" /></button>
              <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"><Video className="w-5 h-5" /></button>
              <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"><Info className="w-5 h-5" /></button>
              <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {loadingMessages && <div className="text-sm text-gray-500">Loading messages...</div>}

            {messages.map((m) => (
              <div key={String(m.id)} className={cn('flex', m.sender === 'agent' ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-xs lg:max-w-md px-4 py-2 rounded-lg', m.sender === 'agent' ? 'bg-white text-gray-800 shadow-sm' : 'bg-cyan-500 text-white')}>
                  <p className="text-sm">{m.content}</p>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {m.attachments.map((a) => (
                        <a key={a.id} href={a.url} className="text-xs underline" target="_blank" rel="noreferrer">{a.filename}</a>
                      ))}
                    </div>
                  )}
                  <p className={cn('text-xs mt-1', m.sender === 'agent' ? 'text-gray-500' : 'text-cyan-100')}>{m.timestamp}</p>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Responses + AI button */}
          <div className="bg-white border-t border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Zap className="text-cyan-500" /> Quick Responses:</div>
              <div className="flex items-center gap-2">
                <button onClick={() => void generateAIQuickResponses('fr')} disabled={aiGenerating} className="text-xs px-3 py-1 rounded bg-cyan-500 text-white hover:bg-cyan-600 transition-colors">
                  {aiGenerating ? 'Génération...' : 'Générer (AI)'}
                </button>
                <button onClick={() => void loadQuickResponses()} className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Reload</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickResponses.map((response) => (
                <button key={response.id} onClick={() => handleQuickResponseClick(response.content)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors">
                  {response.content}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-end gap-3">
              <label className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <Paperclip className="w-5 h-5" />
                <input ref={fileInputRef} type="file" multiple onChange={onFileChange} className="hidden" />
              </label>

             <div className="flex-1 relative">
  <textarea
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="Type your message..."
    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
    rows={1}
  />

  {showEmojiPicker && (
    <div className="absolute bottom-12 left-0 z-50">
    <Picker onEmojiClick={handleEmojiClick} />

    </div>
  )}
</div>

<button
  onClick={() => setShowEmojiPicker((prev) => !prev)}
  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
>
  <Smile className="w-5 h-5" />
</button>


              <button onClick={() => void handleSendMessage()} disabled={sending || (!message.trim() && filesToUpload.length === 0)} className={cn('p-3 rounded-lg transition-colors', message.trim() || filesToUpload.length ? 'bg-cyan-500 hover:bg-cyan-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}>
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a conversation from the sidebar to start chatting</p>
          </div>
        </div>
      )}

      {/* Customer Info Panel */}
      {selectedConversation && currentConversation && (
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          <div className="text-center mb-6">
            <img src={currentConversation.customer.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentConversation.customer.name)}`} alt={currentConversation.customer.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover" />
            <h3 className="text-lg font-semibold text-gray-900">{currentConversation.customer.name}</h3>
            <p className="text-sm text-gray-600">{currentConversation.customer.email}</p>
          </div>

          <div className="space-y-6">
            {/* Status */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Status</h4>
              <div className="flex items-center gap-2">
                <span className={cn('px-3 py-1 text-sm font-medium rounded-full', currentConversation.status === 'Active' ? 'bg-green-100 text-green-800' : currentConversation.status === 'Waiting' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>
                  ● {currentConversation.status}
                </span>
                <span className={cn('px-3 py-1 text-sm font-medium rounded-full', currentConversation.priority === 'High' ? 'bg-red-100 text-red-800' : currentConversation.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')}>
                  {currentConversation.priority}
                </span>
              </div>
            </div>

            {/* Client Information */}
{/* Client Information */}
<div>
  <h4 className="text-sm font-semibold text-gray-900 mb-3">Client Information</h4>
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <MapPin className="w-4 h-4" />
      <span>{conversationDetails?.customer.location ?? 'Unknown location'}</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Clock className="w-4 h-4" />
      <span>Joined {conversationDetails?.customer.joined ?? 'N/A'}</span>
    </div>
  </div>
</div>


            {/* Chat Statistics */}
<div className="flex justify-between text-sm">
  <span className="text-gray-600">Total Chats</span>
<span className="font-medium">{conversationDetails?.stats?.totalChats ?? 0}</span>
</div>
<div className="flex justify-between text-sm">
  <span className="text-gray-600">Satisfaction</span>
  <div className="flex items-center gap-1">
    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
<span className="font-medium">{conversationDetails?.stats?.satisfaction ?? 0}</span>
  </div>
</div>



            {/* Actions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Actions</h4>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"><Plus className="w-4 h-4" />Create Ticket</button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"><History className="w-4 h-4" />View History</button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"><AlertCircle className="w-4 h-4" />Report Issue</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
