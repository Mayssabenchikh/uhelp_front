"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ticketService } from '@/services/api'
import { useAppContext } from '@/context/Context'
import FileUploader from '@/components/FileUploader'
import AttachmentDisplay from '@/components/AttachmentDisplay'

type Maybe<T> = T | null | undefined

export default function TicketDetailPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const ticketId = params?.id as string
  const queryClient = useQueryClient()
  const { user } = useAppContext()
  const { t } = useTranslation()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch ticket and responses
  const { data: ticketRes } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketService.getById(ticketId),
    enabled: Boolean(ticketId)
  })
  const { data: responsesRes } = useQuery({
    queryKey: ['ticket-responses', ticketId],
    queryFn: () => ticketService.getResponses(ticketId),
    enabled: Boolean(ticketId)
  })

  // Defensive parsing: support both ApiResponse and raw ticket shapes
  // Normalize ticket locally: support ApiResponse shapes and multiple client fields
  const rawTicket = (ticketRes && (ticketRes as any).data) ? (ticketRes as any).data : (ticketRes ?? null)
  const normalizeTicketLocal = (src: any) => {
    if (!src || typeof src !== 'object') return null
    const source = src.data ?? src
    // Prefer `user` field when backend uses that naming
    const client = source.user ?? source.client ?? (
      (source.client_id || source.client_name || source.client_email)
        ? { id: source.client_id ?? null, name: source.client_name ?? null, email: source.client_email ?? null }
        : null
    )
    return { ...source, client }
  }
  const ticket = normalizeTicketLocal(rawTicket)
  const client = ticket?.client ?? null

  const responsesArray: any[] = (() => {
    if (!responsesRes) return []
    if (Array.isArray(responsesRes)) return responsesRes
    if (Array.isArray((responsesRes as any).data)) return (responsesRes as any).data
    if (Array.isArray((responsesRes as any)?.data?.data)) return (responsesRes as any).data.data
    return []
  })()

  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // mutation: support file upload with FormData if an attachment is present
  const addResponse = useMutation<any, any, { message: string; attachment?: File | null }>({
    mutationFn: async (payload: { message: string; attachment?: File | null }) => {
      if (payload.attachment) {
        const fd = new FormData()
        fd.append('message', payload.message)
        fd.append('attachment', payload.attachment)
        return ticketService.addResponse(ticketId, fd)
      }
      return ticketService.addResponse(ticketId, payload)
    },
    onSuccess: () => {
      setMessage('')
      setSelectedFile(null)
      queryClient.invalidateQueries({ queryKey: ['ticket-responses', ticketId] })
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message || e?.message || 'Failed to add response')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!message.trim() && !selectedFile) {
      setError(t('messages.enterMessageOrAttachment') || 'Please enter a message or attach a file.')
      return
    }
    addResponse.mutate({ message: message.trim(), attachment: selectedFile })
  }

  const getStatusConfig = (status: string | undefined) => {
    const configs: Record<string, { badge: string; icon: string }> = {
      open: { badge: 'bg-blue-50 text-blue-700 border border-blue-200', icon: '🔵' },
      pending: { badge: 'bg-amber-50 text-amber-700 border border-amber-200', icon: '⏳' },
      closed: { badge: 'bg-green-50 text-green-700 border border-green-200', icon: '✅' },
      resolved: { badge: 'bg-green-50 text-green-700 border border-green-200', icon: '✅' },
      default: { badge: 'bg-gray-50 text-gray-700 border border-gray-200', icon: '⚪' }
    }
    if (!status) return configs.default
    return configs[status] || configs.default
  }

  const getPriorityConfig = (priority: string | undefined) => {
    const configs: Record<string, { badge: string; icon: string }> = {
      high: { badge: 'bg-red-50 text-red-700 border border-red-200', icon: '🔴' },
      medium: { badge: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: '🟡' },
      low: { badge: 'bg-gray-50 text-gray-700 border border-gray-200', icon: '⚪' },
      default: { badge: 'bg-gray-50 text-gray-700 border border-gray-200', icon: '⚪' }
    }
    if (!priority) return configs.default
    return configs[priority] || configs.default
  }

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    const now = new Date()
    const messageDate = new Date(iso)
    const diffMs = now.getTime() - messageDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 6) return `${diffDays} days ago`

    return messageDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  // Loading placeholder if ticket not loaded
  if (!ticket || typeof ticket !== 'object') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-40 bg-gray-100 rounded mt-4" />
          </div>
        </div>
      </div>
    )
  }

  const ticketClientId = client?.id ?? null
  const ticketClientName = client?.name ?? null
  const currentStatus = ticket?.status || ticket?.statut || ''
  const currentPriority = ticket?.priority || ticket?.priorite || ''
  const statusConfig = getStatusConfig(currentStatus)
  const priorityConfig = getPriorityConfig(currentPriority)

  // Temporary debug logs to diagnose persistent 'client' error (remove after debugging)
  if (typeof window !== 'undefined') {
    try {
      console.log('[DEBUG] ticket normalized:', ticket)
      console.log('[DEBUG] client normalized:', client)
      console.log('[DEBUG] ticketClientId:', ticketClientId, 'ticketClientName:', ticketClientName)
      console.log('[DEBUG] responsesArray length:', responsesArray?.length)
    } catch (e) {
      console.error('[DEBUG] logging failed', e)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Ticket Header */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusConfig.badge}`}>
                {statusConfig.icon} {currentStatus || t('tickets.unknownStatus') || 'Unknown'}
              </span>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${priorityConfig.badge}`}>
                {priorityConfig.icon} {currentPriority || t('tickets.unknownPriority') || 'Unknown'} {t('tickets.priority')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {ticket?.subject || ticket?.titre || `Ticket ${ticketId}`}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/clientdashboard/tickets/${ticketId}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium shadow-sm"
            >
              <span>✏️</span>
              {t('actions.edit')} {t('nav.tickets').slice(0, -1)}
            </button>
          </div>
        </div>

        {ticket?.description && (
          <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              {t('tickets.description')}
            </h3>
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">
              {ticket.description}
            </p>
          </div>
        )}
      </div>

      {/* Messages Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-50/50 p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
              💬 {t('messages.title')}
              {responsesArray.length > 0 && (
                <span className="text-sm bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full font-medium">
                  {responsesArray.length} {responsesArray.length > 1 ? t('messages.messagesPlural') : t('messages.messageSingular')}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="p-6">
          {responsesArray.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('messages.noMessages')}</h3>
              <p className="text-gray-600">{t('messages.startConversation')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {responsesArray.map((r: any, index: number) => {
                // Only render responses when we have a valid ticket
                if (!ticket || !r || typeof r !== 'object') return null

                // Helper: compute display name and avatar with defensive checks
                const getResponseDisplayInfo = (resp: any) => {
                  try {
                    const isCurrentUser = resp?.user_id === user?.id

                    let displayName = 'Unknown User'
                    if (isCurrentUser) {
                      displayName = user?.name ?? 'You'
                    } else if (resp?.user && typeof resp.user === 'object' && resp.user?.name) {
                      displayName = resp.user.name
                    } else if (resp?.user_id && ticketClientId && resp.user_id === ticketClientId && ticketClientName) {
                      displayName = `${ticketClientName} (Client)`
                    } else {
                      displayName = resp?.author_name || resp?.created_by_name || 'Unknown User'
                    }

                    const defaultAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
                    let avatar = defaultAvatar
                    if (isCurrentUser) {
                      avatar = user?.avatar || user?.profile_photo_url || defaultAvatar
                    } else if (resp?.user && typeof resp.user === 'object') {
                      avatar = resp.user.avatar || resp.user.profile_photo_url || defaultAvatar
                    }

                    return { isCurrentUser, displayName, avatar }
                  } catch (e) {
                    // Log the problematic response for debugging and return safe defaults
                    if (typeof window !== 'undefined') console.error('[DEBUG] response render error', e, resp)
                    return { isCurrentUser: false, displayName: 'Unknown User', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' }
                  }
                }

                const { isCurrentUser, displayName, avatar } = getResponseDisplayInfo(r)

                const createdAt = r?.created_at || r?.createdAt || r?.created || undefined
                const messageText = r?.message || r?.body || ''

                return (
                  <div key={r?.id ?? `resp-${index}`} className="group">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden">
                        <img
                          src={isMounted ? avatar : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'}
                          alt={isMounted ? displayName : 'User avatar'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Message */}
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100 group-hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{displayName}</h4>
                            <span className="text-sm text-gray-500 font-medium">{formatDate(createdAt)}</span>
                          </div>
                          <p className="text-gray-800 leading-relaxed whitespace-pre-line">{messageText}</p>

                          {/* Attachment Display */}
                          {(r?.attachment_path || r?.attachment_name) && (
                            <div className="mt-3">
                              <AttachmentDisplay
                                responseId={r?.id}
                                attachmentName={r?.attachment_name || r?.filename}
                                attachmentType={r?.attachment_type || ''}
                                attachmentSize={r?.attachment_size || undefined}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < responsesArray.length - 1 && (
                      <div className="ml-5 mt-4 mb-2">
                        <div className="w-px h-4 bg-gray-200" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="bg-gray-50/30 border-t border-gray-100 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-red-600">⚠️</span>
                <span className="text-red-700 text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reply-message" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('messages.yourReply')}
              </label>
              <textarea
                id="reply-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder={t('messages.typeReplyPlaceholder')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all duration-200"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attachment (optional)
              </label>
              <FileUploader
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                className="w-full"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addResponse.isPending || (!message.trim() && !selectedFile)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
              >
                {addResponse.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    {t('messages.sending')}
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    {t('messages.sendReply')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
