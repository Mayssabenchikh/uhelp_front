'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  MessageSquare,
  Settings,
  Edit,
  FileText,
  Shield,
  Activity,
  Mail,
  Building,
  Tag,
  Timer,
  UserCheck,
  Send,
  Star,
  Eye,
  EyeOff,
  Plus,
  MessageCircle,
  ThumbsUp,
  Reply
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Ticket {
  id: number
  titre: string
  description: string
  statut: 'open' | 'in_progress' | 'resolved' | 'closed'
  priorite: 'high' | 'medium' | 'low'
  client_id?: number
  agentassigne_id?: number
  created_at: string
  updated_at: string
  client?: {
    id: number
    name: string
    email: string
  }
  agent?: {
    id: number
    name: string
    email: string
    department?: string
  }
  // Category can be either an object from API or a simple string — on met en optionnel pour compatibilité
  category?: { id: number; name: string } | string
}

interface Feedback {
  id: number
  ticket_id: number
  user_id: number
  rating: number
  comment?: string
  created_at: string
  updated_at: string
}

interface InternalNote {
  id: number
  ticket_id: number
  user_id: number
  message: string
  created_at: string
  updated_at: string
  author: {
    id: number
    name: string
    email: string
  }
}

interface TicketDetailPageProps {
  params: { id: string } | Promise<{ id: string }>
}

// Fetch functions
async function fetchTicket(id: string): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Ticket not found')
    }
    const text = await res.text()
    throw new Error(`Failed to fetch ticket: ${text}`)
  }
  const json = await res.json()
  return json.data ?? json
}

async function fetchFeedback(ticketId: string): Promise<Feedback | null> {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/feedback`, {
    headers: getAuthHeaders()
  })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error('Failed to fetch feedback')
  }
  return res.json()
}

async function fetchInternalNotes(ticketId: string): Promise<InternalNote[]> {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/internal-notes`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    throw new Error('Failed to fetch internal notes')
  }
  return res.json()
}

async function createFeedback(ticketId: string, data: { rating: number; comment?: string }): Promise<Feedback> {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/feedback`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to create feedback')
  }
  const json = await res.json()
  return json.feedback ?? json
}

async function createInternalNote(ticketId: string, message: string): Promise<InternalNote> {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/internal-notes`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to create internal note')
  }
  const json = await res.json()
  return json.note ?? json
}

// Star Rating Component
function StarRating({ rating, onRatingChange, readonly = false }: { 
  rating: number
  onRatingChange?: (rating: number) => void
  readonly?: boolean 
}) {
  const [hoveredRating, setHoveredRating] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "transition-all duration-200",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          onMouseEnter={() => !readonly && setHoveredRating(star)}
          onMouseLeave={() => !readonly && setHoveredRating(0)}
          onClick={() => !readonly && onRatingChange?.(star)}
        >
          <Star
            className={cn(
              "w-5 h-5",
              (hoveredRating || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-slate-300"
            )}
          />
        </button>
      ))}
    </div>
  )
}

// Feedback Form Component
function FeedbackForm({ ticketId, onSuccess }: { ticketId: string; onSuccess: () => void }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const queryClient = useQueryClient()

  const feedbackMutation = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) => createFeedback(ticketId, data),
    onSuccess: () => {
      toast.success('Feedback submitted successfully!')
      queryClient.invalidateQueries({ queryKey: ['feedback', ticketId] })
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }
    feedbackMutation.mutate({ rating, comment: comment.trim() || undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Rate your experience
        </label>
        <StarRating rating={rating} onRatingChange={setRating} />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Comment (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about the resolution..."
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          maxLength={500}
        />
        <div className="text-xs text-slate-500 mt-1">
          {comment.length}/500 characters
        </div>
      </div>

      <button
        type="submit"
        disabled={rating === 0 || feedbackMutation.isPending}
        className={cn(
          "w-full px-4 py-3 rounded-lg font-medium transition-all duration-200",
          rating === 0
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
        )}
      >
        {feedbackMutation.isPending ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Submitting...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            Submit Feedback
          </div>
        )}
      </button>
    </form>
  )
}

// Internal Note Form Component
function InternalNoteForm({ ticketId, onSuccess }: { ticketId: string; onSuccess: () => void }) {
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  const noteMutation = useMutation({
    mutationFn: (message: string) => createInternalNote(ticketId, message),
    onSuccess: () => {
      toast.success('Internal note added successfully!')
      queryClient.invalidateQueries({ queryKey: ['internal-notes', ticketId] })
      setMessage('')
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    noteMutation.mutate(message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Add Internal Note
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a note for internal team communication..."
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          rows={3}
          required
        />
      </div>

      <button
        type="submit"
        disabled={!message.trim() || noteMutation.isPending}
        className={cn(
          "w-full px-4 py-3 rounded-lg font-medium transition-all duration-200",
          !message.trim()
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl"
        )}
      >
        {noteMutation.isPending ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Adding Note...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Add Internal Note
          </div>
        )}
      </button>
    </form>
  )
}

export default function TicketDetailPage(_: TicketDetailPageProps) {
  const router = useRouter()
  const params = useParams() as { id?: string | string[] } | undefined
  const queryClient = useQueryClient()

  // Normalize id to a single string (TS-safe)
  const rawId = params?.id
  const id: string = Array.isArray(rawId) ? rawId[0] : (rawId ?? '')

  const [isMounted, setIsMounted] = useState(false)
  const [showInternalNotes, setShowInternalNotes] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [showInternalNoteForm, setShowInternalNoteForm] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Queries
  const { data: ticket, isLoading, error } = useQuery<Ticket, Error>({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id),
    enabled: isMounted && id !== ''
  })

  const { data: feedback, isLoading: feedbackLoading } = useQuery<Feedback | null, Error>({
    queryKey: ['feedback', id],
    queryFn: () => fetchFeedback(id),
    enabled: isMounted && id !== '' && ticket?.statut === 'closed'
  })

  const { data: internalNotes = [], isLoading: notesLoading } = useQuery<InternalNote[], Error>({
    queryKey: ['internal-notes', id],
    queryFn: () => fetchInternalNotes(id),
    enabled: isMounted && id !== ''
  })

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open': 
        return {
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          icon: <Activity className="w-4 h-4" />,
          label: 'Open'
        }
      case 'in_progress': 
        return {
          color: 'text-blue-700 bg-blue-50 border-blue-200',
          icon: <Timer className="w-4 h-4" />,
          label: 'In Progress'
        }
          case 'resolved': 
        return {
          color: 'text-green-700 bg-green-50 border-green-200',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Resolved'
        }
      case 'closed': 
        return {
          color: 'text-slate-700 bg-slate-50 border-slate-200',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Closed'
        }
      default: 
        return {
          color: 'text-slate-700 bg-slate-50 border-slate-200',
          icon: <Activity className="w-4 h-4" />,
          label: status
        }
    }
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high': 
        return {
          color: 'text-red-700 bg-red-50 border-red-200',
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'High'
        }
      case 'medium': 
        return {
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          icon: <Clock className="w-4 h-4" />,
          label: 'Medium'
        }
      case 'low': 
        return {
          color: 'text-green-700 bg-green-50 border-green-200',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Low'
        }
      default: 
        return {
          color: 'text-slate-700 bg-slate-50 border-slate-200',
          icon: <Clock className="w-4 h-4" />,
          label: priority
        }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  if (!isMounted || id === '') {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <p className="text-slate-600 mt-4 font-medium">Loading ticket details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Error</h2>
            <p className="text-slate-600 mb-6">{error.message}</p>
            <button
              onClick={() => router.push('/superadmindashboard/globaltickets')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Back to Tickets
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Ticket Not Found</h2>
            <p className="text-slate-600 mb-6">The ticket you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/superadmindashboard/globaltickets')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Back to Tickets
            </button>
          </div>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(ticket.statut)
  const priorityConfig = getPriorityConfig(ticket.priorite)

  const categoryLabel = typeof ticket.category === 'string' ? ticket.category : ticket.category?.name

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/superadmindashboard/globaltickets')}
                  className="flex items-center gap-2 px-4 py-2 text-blue-100 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Back</span>
                </button>
                <div className="border-l border-blue-400 pl-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">Ticket #{ticket.id}</h1>
                      <p className="text-blue-100">{getRelativeTime(ticket.created_at)}</p>
                    </div>
                    
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowInternalNotes(!showInternalNotes)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                >
                  {showInternalNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="font-medium">
                    {showInternalNotes ? 'Hide' : 'Show'} Internal Notes
                  </span>
                </button>
                <button
                  onClick={() => router.push(`/superadmindashboard/tickets/${ticket.id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                >
                  <Edit className="w-4 h-4" />
                  <span className="font-medium">Edit</span>
                </button>
                
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  {statusConfig.icon}
                  <span className="text-sm font-medium text-slate-700">Status:</span>
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold",
                    statusConfig.color
                  )}>
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                    {statusConfig.label}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {priorityConfig.icon}
                  <span className="text-sm font-medium text-slate-700">Priority:</span>
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-semibold",
                    priorityConfig.color
                  )}>
                    {priorityConfig.label}
                  </div>
                </div>

                {/* Category display in status bar (minimal change) */}
                {categoryLabel && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span className="text-sm font-medium text-slate-700">Category:</span>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                      {categoryLabel}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-slate-500">
                Last updated: {getRelativeTime(ticket.updated_at)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            {/* Ticket Description */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{ticket.titre}</h2>
                    <p className="text-sm text-slate-600">Detailed problem description</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="prose prose-slate max-w-none">
                  <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                      {ticket.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments and Feedback Section */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Communications</h3>
                      <p className="text-sm text-slate-600">Feedback and internal notes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {ticket.statut === 'closed' && !feedback && (
                      <button
                        onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 text-sm font-medium"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Add Feedback
                      </button>
                    )}
                    <button
                      onClick={() => setShowInternalNoteForm(!showInternalNoteForm)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all duration-200 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Note
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Customer Feedback Section */}
                {ticket.statut === 'closed' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-slate-900">Customer Feedback</h4>
                    </div>
                    
                    {feedbackLoading ? (
                      <div className="animate-pulse bg-slate-100 rounded-lg p-4">
                        <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                      </div>
                    ) : feedback ? (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <StarRating rating={feedback.rating} readonly />
                          <span className="text-sm text-slate-600">
                            {getRelativeTime(feedback.created_at)}
                          </span>
                        </div>
                        {feedback.comment && (
                          <p className="text-slate-700 italic">"{feedback.comment}"</p>
                        )}
                      </div>
                    ) : showFeedbackForm ? (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <FeedbackForm 
                          ticketId={id} 
                          onSuccess={() => setShowFeedbackForm(false)} 
                        />
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p className="text-slate-600 text-sm">No customer feedback yet.</p>
                        <button
                          onClick={() => setShowFeedbackForm(true)}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Add feedback for this closed ticket →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Internal Notes Section */}
                {showInternalNotes && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-slate-900">Internal Notes</h4>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                        {internalNotes.length} note{internalNotes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {notesLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="animate-pulse bg-slate-100 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                            </div>
                            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                          </div>
                        ))}
                      </div>
                    ) : internalNotes.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {internalNotes.map((note) => (
                          <div key={note.id} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                  <span className="font-medium text-slate-900">{note.author.name}</span>
                                  <span className="text-xs text-slate-500 ml-2">{note.author.email}</span>
                                </div>
                              </div>
                              <span className="text-xs text-slate-500">
                                {getRelativeTime(note.created_at)}
                              </span>
                            </div>
                            <p className="text-slate-700 whitespace-pre-wrap">{note.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p className="text-slate-600 text-sm">No internal notes yet.</p>
                      </div>
                    )}

                    {/* Add Internal Note Form */}
                    {showInternalNoteForm && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <InternalNoteForm 
                          ticketId={id} 
                          onSuccess={() => setShowInternalNoteForm(false)} 
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Show more/less toggle for internal notes */}
                <div className="text-center">
                  <button
                    onClick={() => setShowInternalNotes(!showInternalNotes)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2 mx-auto"
                  >
                    {showInternalNotes ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide Internal Communications
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show Internal Communications
                        {internalNotes.length > 0 && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                            {internalNotes.length}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Quick Info Card 
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Quick Info
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ticket ID</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-sm">#{ticket.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created</span>
                  <span className="text-sm font-medium text-slate-700">{formatDate(ticket.created_at).split(' ')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Updated</span>
                  <span className="text-sm font-medium text-slate-700">{formatDate(ticket.updated_at).split(' ')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Comments</span>
                  <span className="text-sm font-medium text-slate-700">
                    {internalNotes.length + (feedback ? 1 : 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Category</span>
                  <span className="text-sm font-medium text-slate-700">{categoryLabel ?? 'N/A'}</span>
                </div>
              </div>
            </div>*/}

            {/* Client Information */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client
                </h3>
              </div>
              <div className="p-4">
                {ticket.client ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{ticket.client.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-3 h-3" />
                          {ticket.client.email}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">No client assigned</p>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Assignment */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Assigned Agent
                </h3>
              </div>
              <div className="p-4">
                {ticket.agent ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <UserCheck className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{ticket.agent.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                          <Mail className="w-3 h-3" />
                          {ticket.agent.email}
                        </div>
                        {ticket.agent.department && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building className="w-3 h-3" />
                            {ticket.agent.department}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <UserCheck className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Awaiting assignment</p>
                    <p className="text-xs text-slate-400 mt-1">An agent will be assigned soon</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Timeline
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="relative">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm">Ticket Created</h4>
                      <p className="text-xs text-slate-600">{formatDate(ticket.created_at)}</p>
                    </div>
                  </div>
                </div>

                {ticket.updated_at !== ticket.created_at && (
                  <div className="relative">
                    <div className="absolute left-4 top-0 w-px h-4 bg-slate-200"></div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 text-sm">Last Updated</h4>
                        <p className="text-xs text-slate-600">{formatDate(ticket.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {internalNotes.length > 0 && (
                  <div className="relative">
                    <div className="absolute left-4 top-0 w-px h-4 bg-slate-200"></div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 text-sm">Internal Communications</h4>
                        <p className="text-xs text-slate-600">
                          Last note: {getRelativeTime(internalNotes[internalNotes.length - 1]?.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {feedback && (
                  <div className="relative">
                    <div className="absolute left-4 top-0 w-px h-4 bg-slate-200"></div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 text-sm">Customer Feedback</h4>
                        <p className="text-xs text-slate-600">
                          {feedback.rating} star{feedback.rating !== 1 ? 's' : ''} - {getRelativeTime(feedback.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Legend 
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Status Legend
                </h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-600">Open - Waiting for processing</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-600">In Progress - Currently being handled</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                  <span className="text-slate-600">Closed - Issue resolved</span>
                </div>
              </div>
            </div>*/}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Quick Actions
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {ticket.statut === 'closed' && !feedback && (
                  <button
                    onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200 text-sm font-medium"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Add Customer Feedback
                  </button>
                )}
                <button
                  onClick={() => setShowInternalNoteForm(!showInternalNoteForm)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all duration-200 text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  {showInternalNoteForm ? 'Cancel Note' : 'Add Internal Note'}
                </button>
                <button
                  onClick={() => setShowInternalNotes(!showInternalNotes)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all duration-200 text-sm font-medium"
                >
                  {showInternalNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showInternalNotes ? 'Hide Communications' : 'View Communications'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Professional Technical Support</h4>
                <p className="text-sm text-slate-600">Your request is being handled with care</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Reference</p>
              <p className="text-lg font-bold text-slate-900">#{ticket.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
