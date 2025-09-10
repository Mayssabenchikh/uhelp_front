"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketService } from '@/services/api'
import { useAppContext } from '@/context/Context'

export default function TicketDetailPage() {
  const params = useParams() as { id?: string }
  const ticketId = params?.id as string
  const queryClient = useQueryClient()
  const { user } = useAppContext()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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

  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addResponse = useMutation({
    mutationFn: (payload: { message: string }) =>
      ticketService.addResponse(ticketId, payload),
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['ticket-responses', ticketId] })
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'Failed to add response')
  })

  const ticket = ticketRes?.data
  const responses = Array.isArray(responsesRes?.data)
    ? responsesRes?.data
    : responsesRes?.data?.data || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    addResponse.mutate({ message })
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      open: { badge: 'bg-blue-50 text-blue-700 border border-blue-200', icon: '🔵' },
      pending: { badge: 'bg-amber-50 text-amber-700 border border-amber-200', icon: '⏳' },
      closed: { badge: 'bg-green-50 text-green-700 border border-green-200', icon: '✅' },
      resolved: { badge: 'bg-green-50 text-green-700 border border-green-200', icon: '✅' },
      default: { badge: 'bg-gray-50 text-gray-700 border border-gray-200', icon: '⚪' }
    }
    return configs[status as keyof typeof configs] || configs.default
  }

  const getPriorityConfig = (priority: string) => {
    const configs = {
      high: { badge: 'bg-red-50 text-red-700 border border-red-200', icon: '🔴' },
      medium: { badge: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: '🟡' },
      low: { badge: 'bg-gray-50 text-gray-700 border border-gray-200', icon: '⚪' },
      default: { badge: 'bg-gray-50 text-gray-700 border border-gray-200', icon: '⚪' }
    }
    return configs[priority as keyof typeof configs] || configs.default
  }

  const formatDate = (date: string) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffTime = Math.abs(now.getTime() - messageDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`

    return messageDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const currentStatus = ticket?.status || ticket?.statut
  const currentPriority = ticket?.priority || ticket?.priorite
  const statusConfig = getStatusConfig(currentStatus)
  const priorityConfig = getPriorityConfig(currentPriority)

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Ticket Header */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusConfig.badge}`}>
                {statusConfig.icon} {currentStatus}
              </span>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${priorityConfig.badge}`}>
                {priorityConfig.icon} {currentPriority} Priority
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {ticket?.subject || ticket?.titre || `Ticket ${ticketId}`}
            </h1>
          </div>
        </div>

        {ticket?.description && (
          <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Description
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
              💬 Messages
              {responses.length > 0 && (
                <span className="text-sm bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full font-medium">
                  {responses.length} message{responses.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="p-6">
          {responses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-600">Start the conversation by sending a message below.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {responses.map((r: any, index: number) => {
                const isCurrentUser = r.user_id === user?.id
                const displayName = isCurrentUser ? user?.name : r.user?.name || `User ${r.user_id}`
                const avatar =
                  isCurrentUser && (user?.avatar || user?.profile_photo_url)
                    ? user.avatar || user.profile_photo_url
                    : r.user?.avatar || r.user?.profile_photo_url ||
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"

                return (
                  <div key={r.id} className="group">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden">
                        <img
                          src={isMounted ? avatar : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"}
                          alt={isMounted ? displayName : "User avatar"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Message */}
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100 group-hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{displayName}</h4>
                            <span className="text-sm text-gray-500 font-medium">
                              {formatDate(r.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                            {r.message || r.body}
                          </p>
                        </div>
                      </div>
                    </div>
                    {index < responses.length - 1 && (
                      <div className="ml-5 mt-4 mb-2">
                        <div className="w-px h-4 bg-gray-200"></div>
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
                Your Reply
              </label>
              <textarea
                id="reply-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your reply here..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all duration-200"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addResponse.isPending || !message.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
              >
                {addResponse.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Send Reply
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
