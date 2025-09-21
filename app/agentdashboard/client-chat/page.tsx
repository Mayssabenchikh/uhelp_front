'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { chatService } from '@/services/chatService'
import { Conversation, ChatMessage, UserShort } from '@/types'
import { getEcho, disconnectEcho } from '@/lib/echo'
import { useAppContext } from '@/context/Context'
import { toast } from 'react-hot-toast'
import {
  Search,
  Send,
  Paperclip,
  Users,
  Clock,
  Star,
  MoreVertical,
  Phone,
  Video,
  Settings,
  X,
  Download,
  Eye,
  Smile,
  Zap,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  User,
  Plus
} from 'lucide-react'
import Picker, { EmojiClickData } from 'emoji-picker-react'

interface ConversationDetails {
  id: number | string
  customer?: {
    id: number | string
    name: string
    email?: string
    avatar?: string | null
    joined?: string
  }
  members?: Array<{
    id: string | number
    name: string
    avatar?: string | null
    online?: boolean
    is_member?: boolean
    role?: string
    is_client?: boolean
  }>
  is_member?: boolean
  stats?: {
    totalChats?: number
    satisfaction?: number
  }
}

interface QuickResponse {
  id: number
  content: string
  title?: string
  language?: string | null
}

interface UploadFile {
  id: string
  file: File
  preview: string
}

export default function AgentClientChatPage() {
  const router = useRouter()
  // Core state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  
  // File handling
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  
  // Quick responses and AI
  const [quickResponses, setQuickResponses] = useState<QuickResponse[]>([])
  const [showQuickResponses, setShowQuickResponses] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAppContext()
  const { t } = useTranslation()

  // Effects
  useEffect(() => {
    if (!user?.id) return
    loadConversations()
    loadQuickResponses()
    
    return () => {
      try {
        if (channelRef.current) channelRef.current.unsubscribe()
      } catch {}
      disconnectEcho()
    }
  }, [user?.id])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      loadConversationDetails(selectedConversation.id)
      subscribeToConversation(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Core functions
  const loadConversations = async () => {
    try {
      setLoading(true)
      
      const data = await chatService.fetchConversations()
      
      const raw = data?.data ?? data ?? []
      const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.conversations ?? [])
      
      // Filter conversations that the agent is a member of
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
        const isMemberFlag = d.details.is_member === true
        const inMembers = Array.isArray(d.details.members) && 
          d.details.members.some((m: any) => String(m.id) === String(uid))
        return isMemberFlag || inMembers
      }).map(d => d.id))

      const normalized = list
        .filter(c => allowedIds.has(c.id))
        .map((c: any) => ({
          id: c.id,
          type: c.type ?? 'direct',
          name: c.title ?? c.name ?? c.subject ?? `Chat ${c.id}`,
          participants: c.participants ?? [],
          last_message: c.last_message ?? c.lastMessage ?? c.latest_message ?? null,
          created_at: c.created_at ?? c.timestamp,
          status: c.status ?? 'Active',
          priority: c.priority ?? 'Medium'
        }))

      setConversations(normalized)
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error('Error loading conversations')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: number | string) => {
    try {
      const data = await chatService.fetchMessages(conversationId)
      
      const raw = data?.data ?? data ?? []
      const messageList: any[] = Array.isArray(raw) ? raw : (raw?.messages ?? raw?.data ?? [])
      
      const normalized = messageList.map((m: any) => ({
        id: m.id,
        conversation_id: m.conversation_id ?? conversationId,
        user_id: m.user_id ?? m.sender_id,
        user: {
          id: m.user?.id ?? m.user_id ?? m.sender_id,
          name: m.user?.name ?? m.sender?.name ?? m.username ?? 'Unknown user',
          avatar: m.user?.avatar ?? m.sender?.avatar ?? null
        },
        message: m.message ?? m.body ?? m.content ?? m.text ?? '',
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
        created_at: m.created_at ?? m.timestamp ?? new Date().toISOString()
      }))

      setMessages(normalized)
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Error loading messages')
    }
  }

  const loadConversationDetails = async (conversationId: number | string) => {
    try {
      const details = await chatService.fetchConversationDetails(conversationId)
      setConversationDetails(details)
    } catch (error) {
      console.error('Error loading conversation details:', error)
      // Set minimal details to avoid blocking the UI
      setConversationDetails({
        id: conversationId,
        customer: {
          id: conversationId,
          name: `Client ${conversationId}`,
          email: undefined
        }
      })
    }
  }

  const loadQuickResponses = async () => {
    try {
      console.log('Loading quick responses...')
      const data: any = await chatService.fetchQuickResponses()
      console.log('Quick responses data received:', data)
      
      // Handle different response formats
      let responses: QuickResponse[] = []
      if (Array.isArray(data)) {
        responses = data.map((item: any, index: number) => ({
          id: item.id || index,
          content: item.content || item.text || item
        }))
      } else if (data?.data && Array.isArray(data.data)) {
        responses = data.data.map((item: any, index: number) => ({
          id: item.id || index,
          content: item.content || item.text || item
        }))
      } else if (data?.suggestions && Array.isArray(data.suggestions)) {
        responses = data.suggestions.map((item: any, index: number) => ({
          id: index,
          content: typeof item === 'string' ? item : item.content || item.text
        }))
      }
      
      console.log('Processed responses:', responses)
      
      setQuickResponses(responses)
      console.log('Quick responses set:', responses.length, 'items')
    } catch (error) {
      console.error('Error loading quick responses:', error)
      setQuickResponses([])
      console.log('Set empty responses due to error')
    }
  }

  const subscribeToConversation = (conversationId: number | string) => {
    try {
      const echo = getEcho()
      if (channelRef.current) channelRef.current.unsubscribe()
      
      const channel = echo.private(`conversation.${conversationId}`)
      channelRef.current = channel

      channel.listen('ChatMessageSent', (payload: any) => {
        const msg: ChatMessage = {
          id: payload.id ?? Date.now(),
          conversation_id: payload.conversation_id ?? conversationId,
          user_id: payload.user_id ?? payload.sender_id,
          user: { 
            id: payload.user?.id ?? payload.user_id ?? payload.sender_id, 
            name: payload.user?.name ?? payload.sender?.name ?? 'User',
            avatar: payload.user?.avatar ?? payload.sender?.avatar ?? null
          },
          message: payload.body ?? payload.message ?? payload.content ?? '',
          attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
          created_at: payload.created_at ?? new Date().toISOString(),
        }
        setMessages((prev) => [...prev, msg])
      })

      channel.listenForWhisper('typing', (e: any) => {
        if (e.user_id !== user?.id) {
          setTypingUsers(prev => [...prev.filter(id => id !== e.user_id), e.user_id])
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(id => id !== e.user_id))
          }, 3000)
        }
      })
    } catch (e) {
      console.error('Echo subscribe failed', e)
    }
  }

  const sendMessage = async () => {
    if (!selectedConversation || (!newMessage.trim() && files.length === 0)) return
    
    try {
      setLoading(true)
      
      const fileArray = files.map(f => f.file)
      
      await chatService.sendMessage(
        selectedConversation.id, 
        newMessage.trim(), 
        fileArray
      )
      
      setNewMessage('')
      setFiles([])
      setShowEmojiPicker(false)
      
      // Reload messages to get the new one
      await loadMessages(selectedConversation.id)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error sending message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const newFiles = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    }))
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter(f => f.id !== fileId)
    })
  }

  // New helpers: resolve attachment URL and provide download/open behavior
  const getAttachmentUrl = (attachment: any) => {
    return (
      attachment?.url ||
      attachment?.download_url ||
      attachment?.path ||
      attachment?.file_url ||
      attachment?.link ||
      null
    )
  }

  const downloadAttachment = async (attachment: any) => {
    const url = getAttachmentUrl(attachment)
    const filename =
      attachment?.name || attachment?.filename || (typeof url === 'string' ? url.split('/').pop() : 'file')

    if (!url) {
      toast.error('Attachment URL not available')
      return
    }

    try {
      // Try to open direct links in a new tab (viewer) — for same-origin or public URLs this will work well
      if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('//'))) {
        // Create an anchor to trigger download where possible, otherwise open in new tab
        const a = document.createElement('a')
        a.href = url
        a.target = '_blank'
        // Set download attribute to suggest filename for same-origin resources
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        return
      }

      // Fallback: fetch the resource and force a download (handles protected endpoints that return blob)
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch attachment')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.error('Download failed', e)
      toast.error('Failed to download attachment')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const insertQuickResponse = (response: QuickResponse) => {
    setNewMessage(response.content)
    setShowQuickResponses(false)
  }

  const generateAIResponse = async () => {
    if (!selectedConversation || aiGenerating) return
    
    try {
      setAiGenerating(true)
      
      // Get context from recent messages
      const lastMessage = messages[messages.length - 1]
      const context = lastMessage ? lastMessage.message : 'Customer support inquiry'
      
      // Create a professional agent prompt in English
      const prompt = `As a professional customer support agent, generate an appropriate response for this customer issue: "${context}". The response should be:
      - Professional and empathetic
      - Solution-oriented
      - Reassuring for the customer
      - In English
      
      Respond directly without numbering or formatting.`
      
      const response: any = await chatService.generateQuickResponses(prompt, 'en')
      
      console.log('AI Response:', response)
      
      // Handle different response formats
      let generatedText = ''
      
      if (typeof response === 'string') {
        generatedText = response
      } else if (response?.suggestion) {
        generatedText = response.suggestion
      } else if (response?.suggestions && Array.isArray(response.suggestions) && response.suggestions.length > 0) {
        generatedText = response.suggestions[0]
      } else if (response?.data && typeof response.data === 'string') {
        generatedText = response.data
      } else if (response?.content) {
        generatedText = response.content
      }
      
      // Clean up the generated text
      if (generatedText) {
        // Remove any numbering or formatting
        generatedText = generatedText.replace(/^\d+[\.\)]\s*/, '').trim()
        generatedText = generatedText.replace(/^[\-\*\+]\s*/, '').trim()
        generatedText = generatedText.replace(/^"(.+)"$/, '$1').trim() // Remove quotes
        
        // Set the generated text as the message
        setNewMessage(generatedText)
        toast.success('AI Response generated successfully')
      } else {
        toast.error('No response generated by AI')
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      toast.error('Error generating AI response')
    } finally {
      setAiGenerating(false)
    }
  }

  const generateAIQuickResponses = async () => {
    if (aiGenerating) return
    
    try {
      setAiGenerating(true)
      
      // Get context from recent messages
      const lastMessages = messages.slice(-3) // Get last 3 messages for context
      const context = lastMessages.length > 0 
        ? lastMessages.map(m => `${m.user.name}: ${m.message}`).join('\n')
        : 'General customer support inquiry'
      
      // Create a simpler prompt that works better with the API
      const prompt = `Generate 6 short and professional responses for a customer support agent. Context: ${context}
      
      Format: one response per line, no numbering.
      Style: professional, empathetic, solution-oriented.
      Language: English.`
      
      console.log('Sending prompt:', prompt)
      
      const response: any = await chatService.generateQuickResponses(prompt, 'en')
      
      console.log('AI Quick Responses received:', response)
      console.log('Response type:', typeof response)
      
      // Parse the response with multiple strategies
      let generatedResponses: string[] = []
      
      // Strategy 1: Direct string parsing
      if (typeof response === 'string') {
        console.log('Parsing as string')
        generatedResponses = response.split(/[\n\r]+/)
          .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
          .filter((line: string) => line.length > 15 && line.length < 200)
      } 
      // Strategy 2: Response has suggestion property
      else if (response?.suggestion && typeof response.suggestion === 'string') {
        console.log('Parsing suggestion property')
        generatedResponses = response.suggestion.split(/[\n\r]+/)
          .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
          .filter((line: string) => line.length > 15 && line.length < 200)
      }
      // Strategy 3: Response has data property
      else if (response?.data && typeof response.data === 'string') {
        console.log('Parsing data property')
        generatedResponses = response.data.split(/[\n\r]+/)
          .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
          .filter((line: string) => line.length > 15 && line.length < 200)
      }
      
      console.log('Generated responses after parsing:', generatedResponses)
      
      // If we got good responses, use them
      if (generatedResponses.length >= 3) {
        const newQuickResponses = generatedResponses.slice(0, 6).map((content, index) => ({
          id: Date.now() + index,
          content: content.replace(/^["'](.+)["']$/, '$1').trim()
        }))
        
        setQuickResponses(newQuickResponses)
        toast.success(`✅ ${newQuickResponses.length} new responses generated with AI`)
        console.log('Set new AI responses:', newQuickResponses)
      } else {
        // No fallback responses - just clear the list
        setQuickResponses([])
        toast.error('❌ No response generated by AI')
      }
    } catch (error) {
      console.error('Error generating AI quick responses:', error)
      toast.error('❌ Error during generation.')
      
      // Clear responses on error instead of using fallback
      setQuickResponses([])
    } finally {
      setAiGenerating(false)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversationDetails?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">{t('nav.clientChat', { defaultValue: 'Client Chat' })}</h1>
            <button 
              onClick={() => router.push('/agentdashboard/client-chat/create')}
              className="flex items-center gap-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('clientChat.newDiscussion', { defaultValue: 'New Discussion' })}
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('clientChat.searchConversations', { defaultValue: 'Search conversations...' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{t('clientChat.noConversations', { defaultValue: 'No conversations found' })}</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200 ${
                  selectedConversation?.id === conversation.id ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-r-4 border-r-teal-500 shadow-sm' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {conversation.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      conversation.status === 'Active' ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {conversation.last_message?.created_at && formatTime(conversation.last_message.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.last_message?.message || ''}
                      </p>
                      <div className="flex items-center space-x-2">
                        {conversation.priority === 'High' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        {conversation.status === 'Active' && (
                          <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-transform duration-200 group-hover:scale-105">
                      {conversationDetails?.customer?.name?.charAt(0)?.toUpperCase() || 
                       selectedConversation.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                      selectedConversation.status === 'Active' ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {conversationDetails?.customer?.name || selectedConversation.name}
                    </h2>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedConversation.status === 'Active' 
                          ? 'bg-green-100 text-green-800'
                          : selectedConversation.status === 'Waiting'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedConversation.status}
                      </span>
                      {conversationDetails?.customer?.email && (
                        <span>{conversationDetails.customer.email}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Conversation options removed as requested */}
                </div>
              </div>

              {typingUsers.length > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  <span className="inline-flex items-center">
                    <div className="flex space-x-1 mr-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    {typingUsers.length === 1 ? t('chat.userTyping', { defaultValue: 'User is typing...' }) : t('chat.multipleUsersTyping', { defaultValue: 'Multiple users are typing...' })}
                  </span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>{t('clientChat.startConversation', { defaultValue: 'Start the conversation by sending a message' })}</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isCurrentUser = message.user_id === user?.id
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                        {!isCurrentUser && (
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="relative w-6 h-6">
                              {message.user.avatar ? (
                                <img 
                                  src={message.user.avatar} 
                                  alt={message.user.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                  onError={(e) => {
                                    // Fallback to initials if image fails to load
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : null}
                              <div className={`w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-semibold ${message.user.avatar ? 'absolute inset-0' : ''}`}
                                   style={{ display: message.user.avatar ? 'none' : 'flex' }}>
                                {message.user.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {message.user.name}
                            </span>
                          </div>
                        )}
                        
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            isCurrentUser
                              ? 'bg-teal-500 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.attachments.map((attachment: any, index: number) => {
                                const filename = attachment?.name || attachment?.filename || (attachment?.url || attachment?.path || '').split('/').pop() || 'File'
                                return (
                                  <div
                                    key={index}
                                    className={`flex items-center space-x-2 p-2 rounded ${
                                      isCurrentUser ? 'bg-teal-600' : 'bg-gray-100'
                                    }`}
                                  >
                                    <Paperclip className="w-4 h-4" />
                                    <span title={filename} className="text-sm truncate">{filename}</span>
                                    <button
                                      onClick={() => downloadAttachment(attachment)}
                                      className="ml-auto text-gray-700 hover:text-teal-600"
                                      title="Download / Open"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          
                          <div className={`text-xs mt-1 ${isCurrentUser ? 'text-teal-100' : 'text-gray-500'}`}>
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File Preview */}
            {files.length > 0 && (
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex flex-wrap gap-2">
                  {files.map((file) => (
                    <div key={file.id} className="relative">
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
                        {file.preview ? (
                          <img src={file.preview} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <Paperclip className="w-8 h-8 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-700 max-w-32 truncate">
                          {file.file.name}
                        </span>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Responses */}
            {showQuickResponses && (
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-700">{t('chat.quickResponses', { defaultValue: 'Quick Responses' })}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {quickResponses.length} responses
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={generateAIQuickResponses}
                      disabled={aiGenerating}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        aiGenerating 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {aiGenerating ? '⏳ Generating...' : '🤖 Generate with AI'}
                    </button>
                    <button
                      onClick={() => setShowQuickResponses(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {quickResponses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {quickResponses.slice(0, 6).map((response, index) => (
                      <button
                        key={`${response.id}-${index}`} // Use both id and index for uniqueness
                        onClick={() => insertQuickResponse(response)}
                        className="px-3 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-teal-100 hover:to-teal-200 rounded-lg text-gray-700 hover:text-teal-800 transition-all duration-200 border border-gray-200 hover:border-teal-300"
                        title={response.content}
                      >
                        {response.content.substring(0, 35) + (response.content.length > 35 ? '...' : '')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-sm mb-2">💬</div>
                    <p className="text-xs text-gray-500 mb-3">No quick responses available</p>
                    <button
                      onClick={generateAIQuickResponses}
                      disabled={aiGenerating}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        aiGenerating 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {aiGenerating ? '⏳ Generating...' : '🤖 Generate with AI'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 z-50">
                <Picker onEmojiClick={handleEmojiClick} />
              </div>
            )}

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                {/* AI and Quick Response buttons */}
                <div className="flex space-x-1">
                  <button
                    onClick={generateAIResponse}
                    disabled={aiGenerating}
                    className="p-2 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    title={t('chat.generateAI', { defaultValue: 'Generate AI Response' })}
                  >
                    {aiGenerating ? (
                      <div className="w-5 h-5 animate-spin border-2 border-teal-500 border-t-transparent rounded-full"></div>
                    ) : (
                      <Zap className="w-5 h-5" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowQuickResponses(!showQuickResponses)}
                    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                      showQuickResponses ? 'text-teal-600 bg-teal-50' : 'text-gray-400 hover:text-teal-600'
                    } ${aiGenerating ? 'animate-pulse' : ''}`}
                    title={t('chat.quickResponses', { defaultValue: 'Quick Responses' })}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>

                {/* Message input */}
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('chat.typeYourMessage', { defaultValue: 'Type your message...' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex space-x-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={sendMessage}
                    disabled={loading || (!newMessage.trim() && files.length === 0)}
                    className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('chat.send', { defaultValue: 'Send' })}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                {t('clientChat.selectConversation', { defaultValue: 'Select a conversation' })}
              </h2>
              <p className="text-gray-500">
                {t('clientChat.chooseConversation', { defaultValue: 'Choose a conversation from the list to start chatting with clients' })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
