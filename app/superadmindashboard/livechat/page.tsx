'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Search,
  Info,
  Paperclip,
  Smile,
  Send,
  Users,
  AlertCircle,
  Zap,
  Clock,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { chatService } from '@/services/chatService'
import Picker, { EmojiClickData } from 'emoji-picker-react'

/** TYPES **/
interface AttachmentDTO { id: number | string; url?: string | null; path?: string | null; filename: string; mime?: string | null; size?: number | null }
type Sender = 'user' | 'agent' | 'admin';
interface ChatMessage { id: string | number; sender: Sender; senderName?: string; content: string; timestamp: string; attachments?: AttachmentDTO[]; authorId?: string | number | null }
interface Conversation { id: string | number; customer: { name: string; email?: string; avatar?: string | null }; status: 'Active' | 'Waiting' | 'Resolved'; priority: 'High' | 'Medium' | 'Low'; lastMessage?: string; timestamp?: string; unreadCount?: number; onlineCount?: number }
interface QuickResponse { id: number; content: string; title?: string; language?: string | null }
interface ConversationDetails {
  id?: string | number
  customer?: {
    id?: number | string
    name?: string
    email?: string
    avatar?: string | null
    joined?: string
  }
  members?: Array<{ id?: string | number; name?: string; avatar?: string | null; online?: boolean; is_member?: boolean; role?: string; is_client?: boolean }>
  is_member?: boolean
  stats?: {
    totalChats?: number
    satisfaction?: number
  }
}
interface CurrentUser { id?: string | number; name?: string; role?: string }

// Local wrapper for file + preview
interface UploadFile { id: string; file: File; preview: string }

/** helpers **/
const mapSender = (role?: string | null): Sender => {
  if (!role) return 'user';
  const roleLower = role.toLowerCase();
  if (roleLower === 'admin') return 'admin';
  if (roleLower === 'agent' || roleLower === 'support') return 'agent';
  return 'user';
};

function formatTimestamp(ts?: string): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** API base (used for attachment url build) */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000/api'

/** helper to normalize attachment url client-side **/
function computeAttachmentUrl(a: any): string | null {
  if (!a) return null
  if (a.url && typeof a.url === 'string') {
    if (a.url.startsWith('http')) return a.url
    return `${API_BASE.replace(/\/api\/?$/, '')}${a.url.startsWith('/') ? '' : '/'}${a.url}`
  }
  if (a.path) {
    return `${API_BASE.replace(/\/api\/?$/, '')}/storage/${a.path.replace(/^\/+/, '')}`
  }
  if (a.link) return a.link
  if (a.path_public) return `${API_BASE.replace(/\/api\/?$/, '')}/storage/${a.path_public}`
  return null
}

/** COMPONENT */
export default function LiveChatPage(): React.JSX.Element {
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
  const [filesToUpload, setFilesToUpload] = useState<UploadFile[]>([])
  const [aiGenerating, setAiGenerating] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  // EMOJI
  const handleEmojiClick = (emojiObject: EmojiClickData, _event: any) => setMessage(prev => prev + emojiObject.emoji)

  // Current user
  useEffect(() => { void (async () => { try { const data = await chatService.me(); setCurrentUser(data?.user ?? data ?? null) } catch { setCurrentUser(null) } })() }, [])

  // Load conversations
  useEffect(() => { const t = setTimeout(() => { void loadConversations() }, 250); return () => clearTimeout(t) }, [selectedTab, searchTerm])

  // Load messages & details
  useEffect(() => {
    if (selectedConversation) {
      void loadMessages(selectedConversation)
      void loadConversationDetails(selectedConversation)
    } else { setMessages([]); setConversationDetails(null) }
  }, [selectedConversation])

  // Auto scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      filesToUpload.forEach(f => URL.revokeObjectURL(f.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadConversations() {
    setLoadingConvs(true)
    try {
      const params = { status: selectedTab, search: searchTerm }
      const res = await chatService.fetchConversations(params)
      const list = Array.isArray(res) ? res : (res.data ?? res.items ?? res)
      const normalized: Conversation[] = (list as any[]).map(c => ({
        id: c.id,
        customer: { name: c.title ?? c.name ?? 'Sans titre', email: c.email ?? '', avatar: c.avatar ?? null },
        status: (c.status ?? 'Active') as Conversation['status'],
        priority: (c.priority ?? 'Low') as Conversation['priority'],
        lastMessage: c.last_message ?? c.lastMessage ?? c.preview ?? '',
        timestamp: formatTimestamp(c.updated_at ?? c.created_at ?? c.timestamp ?? ''),
        unreadCount: c.unread_count ?? c.unreadCount ?? 0,
        onlineCount: c.online_count ?? c.members_online ?? c.onlineMembers ?? 0
      }))
      setConversations(normalized)
      if (!selectedConversation && normalized.length > 0) setSelectedConversation(String(normalized[0].id))
    } catch (err) { console.error('loadConversations error', err) } finally { setLoadingConvs(false) }
  }

  async function loadMessages(conversationId: string | number) {
    setLoadingMessages(true)
    try {
      const res = await chatService.fetchMessages(conversationId)
      const list = Array.isArray(res) ? res : (res.data ?? res.messages ?? res)
      const normalized: ChatMessage[] = (list as any[]).map(m => {
        const role: string | undefined = m.user?.role ?? m.user_role ?? m.role
        const body: string = m.body ?? m.content ?? m.message ?? ''
        const senderName = m.user?.name ?? m.user?.full_name ?? m.sender_name ?? m.author?.name ?? (role === 'agent' ? 'Agent' : 'Client')
        const rawAttachments = (m.attachments ?? m.files ?? m.attachments_data ?? [])
        const attachments: AttachmentDTO[] = Array.isArray(rawAttachments) ? rawAttachments.map((a: any) => {
          const url = computeAttachmentUrl(a)
          return {
            id: a.id ?? a.attachment_id ?? a.path ?? a.filename ?? Math.random(),
            url,
            path: a.path ?? null,
            filename: a.filename ?? a.original_name ?? a.name ?? 'unknown',
            mime: a.mime ?? a.type ?? null,
            size: a.size ?? a.file_size ?? null
          }
        }) : []
        return {
          id: m.id,
          authorId: m.user?.id ?? m.user_id ?? m.author?.id ?? null,
          sender: mapSender(role),
          senderName,
          content: body,
          timestamp: formatTimestamp(String(m.created_at ?? m.timestamp ?? m.createdAt ?? '')),
          attachments
        }
      })
      setMessages(normalized)
    } catch (err) { console.error('loadMessages error', err); setMessages([]) } finally { setLoadingMessages(false) }
  }

  async function loadConversationDetails(conversationId: string | number) {
    try {
      const data = await chatService.fetchConversationDetails(conversationId)
      if (data?.customer?.joined) data.customer.joined = formatTimestamp(data.customer.joined)
      setConversationDetails(data ?? null)
    } catch (err) { console.error('loadConversationDetails error', err); setConversationDetails(null) }
  }

  // Simplified membership check
  function isMember(): boolean {
    try {
      if (!conversationDetails) return false
      if (conversationDetails.is_member === true) return true
      const uid = currentUser?.id ?? null
      if (!conversationDetails.members || !Array.isArray(conversationDetails.members)) return false
      return conversationDetails.members.some(m => String(m.id) === String(uid) && m.is_member)
    } catch { return false }
  }

  async function joinConversation(convId: string | number) {
    try {
      await chatService.joinConversation(convId)
      await loadConversationDetails(convId)
      alert('Vous avez rejoint la conversation !')
    } catch (err: any) { console.error(err); alert(err?.message ?? 'Erreur lors de la tentative de rejoindre') }
  }

  // NEW: handle files as UploadFile[] with preview URLs
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const arr = Array.from(e.target.files)
    const newUploads: UploadFile[] = arr.map(f => ({ id: `u_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, file: f, preview: URL.createObjectURL(f) }))

    // Revoke previews from previous selection to avoid leaks
    filesToUpload.forEach(f => URL.revokeObjectURL(f.preview))
    setFilesToUpload(newUploads)
  }

  function handleRemoveFile(id: string) {
    setFilesToUpload(prev => {
      const item = prev.find(p => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(p => p.id !== id)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendMessage() }
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
  function handleQuickResponseClick(text: string) {
    setMessage(text)
    const ta = document.querySelector('textarea'); if (ta) (ta as HTMLTextAreaElement).focus()
  }

  async function generateAIQuickResponses(language: string = 'fr') {
    if (!selectedConversation) return
    setAiGenerating(true)
    try {
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
      alert('Erreur: impossible de générer des réponses AI. Vérifie la connexion et les permissions.')
    } finally {
      setAiGenerating(false)
    }
  }

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

  async function handleSendMessage() {
    if ((!message.trim() && filesToUpload.length === 0) || !selectedConversation) return
    if (!isMember()) { alert("Vous n'êtes pas membre..."); return }

    setSending(true)
    const tempId = `temp-${Date.now()}`

    const optimistic: ChatMessage = {
      id: tempId,
      sender: mapSender(currentUser?.role ?? null),
      senderName: currentUser?.name ?? 'Vous',
      content: message,
      timestamp: formatTimestamp(new Date().toISOString()),
      attachments: filesToUpload.map((u) => ({ id: u.id, url: u.preview, filename: u.file.name, mime: u.file.type, size: u.file.size }))
    }
    setMessages(prev => [...prev, optimistic])

    try {
      // Prepare body: if message empty but we have files -> send a textual placeholder
      const textToSend = (message && message.trim()) ? message.trim() : (filesToUpload.length > 0 ? '[Fichier(s) joint(s)]' : '')
      const convId = Number(selectedConversation) // ensure numeric

      console.debug('[UI] sending message', { conversation: convId, body: textToSend, filesCount: filesToUpload.length })

      // For debugging: build a FormData preview (only in dev)
      if (process.env.NODE_ENV !== 'production') {
        try {
          const fd = new FormData()
          fd.append('conversation_id', String(convId))
          fd.append('body', textToSend)
          filesToUpload.forEach((f) => fd.append('files[]', f.file))
          // Log keys (not values) to avoid huge logs
          for (const k of (fd as any).keys()) { console.debug('[FormData key]', k) }
        } catch (e) {
          console.debug('Could not build debug FormData', e)
        }
      }

      const res = await chatService.sendMessage(convId, textToSend, filesToUpload.map(u => u.file))
      console.debug('[UI] sendMessage result', res)

      const payload = res?.message ?? res

      if (!payload || !payload.id) {
        // rollback optimistic
        setMessages(prev => prev.filter(m => String(m.id) !== String(tempId)))
        alert('Le serveur n’a pas persisté le message — vérifiez la console & les logs serveur.')
        console.error('No payload returned from sendMessage', res)
        return
      }

      const serverMsg: ChatMessage = {
        id: payload.id,
        sender: mapSender(payload?.user?.role ?? payload?.user_role ?? null),
        senderName: payload?.user?.name ?? currentUser?.name ?? 'Client',
        content: payload?.body ?? payload?.content ?? textToSend ?? '',
        timestamp: formatTimestamp(String(payload?.created_at ?? payload?.createdAt ?? new Date().toISOString())),
        attachments: (payload?.attachments ?? payload?.files ?? []).map((a: any) => ({
          id: a.id ?? Math.random(),
          url: a.url ?? (a.path ? `${API_BASE.replace(/\/api\/?$/, '')}/storage/${a.path}` : null),
          path: a.path ?? null,
          filename: a.filename ?? a.original_name ?? a.name ?? 'unknown',
          mime: a.mime ?? null,
          size: a.size ?? null
        }))
      }

      // replace optimistic with server message
      setMessages(prev => {
        const filtered = prev.filter(m => String(m.id) !== String(tempId))
        return [...filtered, serverMsg]
      })

      // cleanup previews and input
      filesToUpload.forEach(f => URL.revokeObjectURL(f.preview))
      setMessage('')
      setFilesToUpload([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err: any) {
      // rollback optimistic and surface error
      setMessages(prev => prev.filter(m => String(m.id) !== String(tempId)))
      console.error('[UI] send error', err)
      alert('Erreur lors de l\'envoi du message : ' + (err?.message ?? 'unknown'))
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files)
      const uploads = arr.map(f => ({ id: `u_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, file: f, preview: URL.createObjectURL(f) }))
      // revoke previous previews
      filesToUpload.forEach(f => URL.revokeObjectURL(f.preview))
      setFilesToUpload(uploads)
    }
  }

  const handleQuickResponseSelect = (qr: QuickResponse) => setMessage(prev => (prev ? prev + ' ' : '') + qr.content)

  // client-side filtering
  const filteredConversations = conversations.filter((conv) =>
    conv.status === selectedTab &&
    (conv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conv.customer?.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conv.lastMessage ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
  )
  const currentConversation = conversations.find((c) => String(c.id) === String(selectedConversation))

  const anyMemberOnline = conversationDetails?.members?.some(
    m => String(m.id) === String(currentUser?.id)
  ) ?? false

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
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{conversation.customer.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', conversation.status === 'Active' ? 'bg-green-100 text-green-800' : conversation.status === 'Waiting' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>
                        {conversation.status}
                      </span>
                      <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-2', conversation.priority === 'High' ? 'bg-red-100 text-red-800' : conversation.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')}>
                        {conversation.priority}
                        {conversation.priority === 'High' && <AlertCircle className="w-3 h-3 text-red-600" />}
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
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {currentConversation.customer.name}
                  {anyMemberOnline && <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Member online" />}
                </h3>
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
              <button onClick={() => setShowInfoModal(true)} className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" title="Info"><Info className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {loadingMessages && <div className="text-sm text-gray-500">Loading messages...</div>}

            {messages.map((m) => (
              <div key={String(m.id)} className={cn('flex', m.sender === 'agent' ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-xs lg:max-w-md px-4 py-2 rounded-lg', m.sender === 'agent' ? 'bg-white text-gray-800 shadow-sm' : 'bg-cyan-500 text-white')}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xs font-semibold">{m.senderName}</div>
<div className="text-xs text-yellow-300">
  • {m.sender === 'admin' ? 'Admin' : m.sender === 'agent' ? 'Agent' : 'Client'}
</div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {!(m.content === '[Fichier(s) joint(s)]' && m.attachments && m.attachments.length > 0) ? m.content : ''}
                  </p>

                 {m.attachments && m.attachments.length > 0 && (
  <div className="mt-2 flex flex-col gap-2">
    {m.attachments.map((a) => (
      <div key={String(a.id)} className="text-xs flex items-center gap-2">
        {a.mime?.startsWith?.('image') || /\.(png|jpe?g|gif|webp|svg)$/i.test(a.filename) ? (
          a.url ? (
            <a href={a.url} target="_blank" rel="noreferrer" className="inline-block">
              <img src={a.url} alt={a.filename} className="w-28 h-20 object-cover rounded" />
            </a>
          ) : (
            <div className="w-28 h-20 bg-gray-100 rounded flex items-center justify-center">Preview</div>
          )
        ) : null}

        <div className="flex-1">
          {a.url ? (
            <a href={a.url} download={a.filename} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline flex items-center gap-2">
              <span>📎</span>
              <span className="truncate max-w-[240px]">{a.filename}</span>
            </a>
          ) : (
            <div className="text-xs text-gray-700">{a.filename}</div>
          )}
          {a.size ? <div className="text-[11px] text-gray-500">{Math.round((a.size/1024)*10)/10} KB</div> : null}
        </div>
      </div>
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
                  {aiGenerating ? 'Generation...' : 'Generate (AI)'}
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

          {/* Message Input / Join notice */}
          <div className="bg-white border-t border-gray-200 ">
            {!isMember() ? (
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex-1 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                  You are not a member of this conversation — click <strong>Join</strong> to participate.
                </div>
                <div>
                  <button onClick={() => void joinConversation(selectedConversation!)} className="px-3 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition-colors">Join</button>
                </div>
              </div>
            ) : (
            <div className="bg-white border-t border-gray-200 p-4">
  <div className="flex items-end gap-3">
    {/* Upload Files */}
    <label className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
      <Paperclip className="w-5 h-5" />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={onFileChange}
        className="hidden"
      />
      {filesToUpload.length > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold leading-none text-white bg-cyan-600 rounded-full">{filesToUpload.length}</span>
      )}
    </label>

    {/* Message + files preview area */}
    <div className="flex-1 relative">
      {/* Selected files preview */}
      {filesToUpload.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {filesToUpload.map(f => (
            <div key={f.id} className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-md text-xs">
              {f.file.type.startsWith('image') ? (
                <img src={f.preview} alt={f.file.name} className="w-8 h-6 object-cover rounded" />
              ) : (
                <span className="inline-flex w-8 h-6 items-center justify-center text-[12px]" aria-hidden="true">📎</span>

              )}
              <div className="max-w-[200px] truncate">{f.file.name}</div>
              <button type="button" onClick={() => handleRemoveFile(f.id)} className="ml-2 p-1 rounded hover:bg-gray-200">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        rows={1}
      />

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-12 left-0 z-50">
          <Picker onEmojiClick={handleEmojiClick} />
        </div>
      )}
    </div>

    {/* Toggle Emoji Picker */}
    <button
      onClick={() => setShowEmojiPicker((prev) => !prev)}
      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Smile className="w-5 h-5" />
    </button>

    {/* Send Button */}
    <button
      onClick={() => void handleSendMessage()}
      disabled={sending || (!message.trim() && filesToUpload.length === 0)}
      className={cn(
        'p-3 rounded-lg transition-colors flex items-center gap-2',
        message.trim() || filesToUpload.length
          ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      )}
    >
      <Send className="w-5 h-5" />
      {filesToUpload.length > 0 && <span className="text-xs">Send {filesToUpload.length}</span>}
    </button>
  </div>
</div>
            )}
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

            {!isMember() && (
              <div className="mt-3">
                <button onClick={() => void joinConversation(selectedConversation!)} className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition-colors">Join</button>
              </div>
            )}
          </div>

          <div className="space-y-6">
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

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Client Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Joined {conversationDetails?.customer?.joined ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Chats</span>
              <span className="font-medium">{typeof conversationDetails?.stats?.totalChats === 'number' ? conversationDetails!.stats!.totalChats : '-'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowInfoModal(false)} />
          <div className="relative bg-white w-11/12 md:w-1/2 max-h-[80vh] overflow-y-auto p-6 rounded-lg shadow-lg z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Conversation info</h3>
              <button onClick={() => setShowInfoModal(false)} className="text-gray-600">Close</button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Customer</h4>
                <p>{conversationDetails?.customer?.name ?? currentConversation?.customer?.name}</p>
                <p className="text-sm text-gray-600">{conversationDetails?.customer?.email ?? currentConversation?.customer?.email}</p>
                <p className="text-sm text-gray-500">Joined: {conversationDetails?.customer?.joined ?? 'N/A'}</p>
              </div>

              <div>
                <h4 className="font-medium">Members{typeof conversationDetails?.members?.length === 'number' ? ` (${conversationDetails!.members!.length})` : ''}</h4>
                <ul className="space-y-2">
                  {(conversationDetails?.members ?? []).map((m: any, idx: number) => (
                    <li key={m?.id ?? idx} className="flex items-center gap-3">
                      <img src={m?.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(m?.name ?? 'User')}`} alt={m?.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="font-medium text-sm">{m?.name}</div>
                        <div className="text-xs text-gray-500">{m?.role ?? 'member'} {m?.online ? '• online' : ''}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
