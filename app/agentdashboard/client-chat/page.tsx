'use client'

import { useState, useEffect, useRef } from 'react'
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
      const data = await chatService.fetchQuickResponses()
      
      // Handle the predefined response format
      let responses: QuickResponse[] = []
      if (Array.isArray(data)) {
        responses = data
      } else if (data?.data) {
        responses = Array.isArray(data.data) ? data.data : []
      }
      
      setQuickResponses(responses)
    } catch (error) {
      console.error('Error loading quick responses:', error)
      // This shouldn't happen now since we return static data
      setQuickResponses([])
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
      // Use the available generateQuickResponses method with the last message as context
      const lastMessage = messages[messages.length - 1]
      const context = lastMessage ? lastMessage.message : 'Support client'
      
      const response = await chatService.generateQuickResponses(context)
      if (response?.suggestions && response.suggestions.length > 0) {
        setNewMessage(response.suggestions[0])
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      toast.error('Error generating AI response')
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
            <h1 className="text-xl font-bold text-gray-900">Client Chat</h1>
            <button 
              onClick={() => router.push('/agentdashboard/client-chat/create')}
              className="flex items-center gap-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Discussion
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
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
              <p>No conversations found</p>
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
                    {typingUsers.length === 1 ? 'User is typing...' : 'Multiple users are typing...'}
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
                    <p>Start the conversation by sending a message</p>
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
                              {message.attachments.map((attachment, index) => (
                                <div
                                  key={index}
                                  className={`flex items-center space-x-2 p-2 rounded ${
                                    isCurrentUser ? 'bg-teal-600' : 'bg-gray-100'
                                  }`}
                                >
                                  <Paperclip className="w-4 h-4" />
                                  <span className="text-sm truncate">{attachment.name || 'File'}</span>
                                  <button className="ml-auto">
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
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
            {showQuickResponses && quickResponses.length > 0 && (
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Quick Responses</h3>
                  <button
                    onClick={() => setShowQuickResponses(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickResponses.slice(0, 5).map((response) => (
                    <button
                      key={response.id}
                      onClick={() => insertQuickResponse(response)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                    >
                      {response.title || response.content.substring(0, 30) + '...'}
                    </button>
                  ))}
                </div>
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
                    title="Generate AI Response"
                  >
                    {aiGenerating ? (
                      <div className="w-5 h-5 animate-spin border-2 border-teal-500 border-t-transparent rounded-full"></div>
                    ) : (
                      <Zap className="w-5 h-5" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowQuickResponses(!showQuickResponses)}
                    className="p-2 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-100"
                    title="Quick Responses"
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
                    placeholder="Type your message..."
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
                Select a conversation
              </h2>
              <p className="text-gray-500">
                Choose a conversation from the list to start chatting with clients
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
