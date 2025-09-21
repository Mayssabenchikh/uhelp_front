'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAppContext } from '@/context/Context'
import { ticketService } from '@/services/api'
import { 
  ArrowLeft, 
  Clock, 
  User, 
  AlertTriangle, 
  MessageCircle, 
  Send,
  Edit3,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { Ticket, TicketResponse } from '@/types'
import FileUploader from '@/components/FileUploader'
import AttachmentDisplay from '@/components/AttachmentDisplay'
import toast from 'react-hot-toast'

interface TicketDetail extends Omit<Ticket, 'description' | 'client'> {
  titre?: string
  priorite?: string
  statut?: string
  description?: string
  agentassigne_id?: number
  client?: any
  responses?: TicketResponse[]
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800', 
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-purple-100 text-purple-800'
}

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAppContext()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [responses, setResponses] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [responseLoading, setResponseLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const ticketId = params.id as string

  useEffect(() => {
    if (ticketId) {
      loadTicketDetails()
    }
  }, [ticketId])

  const loadTicketDetails = async () => {
    try {
      setLoading(true)
      const [ticketData, responsesData] = await Promise.all([
        ticketService.getById(ticketId),
        ticketService.getResponses(ticketId)
      ])

      // Handle ticket data
      const ticketPayload = ticketData?.data || ticketData
      setTicket(ticketPayload)

      // Handle responses data
      const responsesList = responsesData?.data || responsesData || []
      setResponses(Array.isArray(responsesList) ? responsesList : [])
    } catch (error) {
      console.error('Error loading ticket details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      // Validate status value first
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
      if (!validStatuses.includes(newStatus)) {
        toast.error(`Invalid status: ${newStatus}`)
        return
      }
      
      // Update with the validated status
      const updateData = { statut: newStatus }
      
      const result = await ticketService.update(ticketId, updateData)
      
      // Update local state
      setTicket(prev => prev ? { ...prev, status: newStatus, statut: newStatus } : null)
      toast.success('Ticket status updated successfully!')
      
    } catch (error: any) {
      console.error('Status update failed:', error)
      
      // Show detailed error information
      let errorMessage = 'Failed to update ticket status.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors
        if (typeof errors === 'object') {
          errorMessage = Object.values(errors).flat().join(', ')
        } else {
          errorMessage = errors.toString()
        }
      }
      
      toast.error(errorMessage)
    }
  }

  const handleAddResponse = async () => {
    if (!newMessage.trim() && !selectedFile) return

    try {
      setResponseLoading(true)
      await ticketService.addResponse(ticketId, {
        message: newMessage,
        attachment: selectedFile
      })
      
      setNewMessage('')
      setSelectedFile(null)
      await loadTicketDetails() // Reload to get updated responses
      toast.success('Response added successfully!')
    } catch (error) {
      console.error('Error adding response:', error)
      toast.error('Failed to add response. Please try again.')
    } finally {
      setResponseLoading(false)
    }
  }

  const getStatus = (ticket: TicketDetail) => {
    return ticket.status || ticket.statut || 'open'
  }

  const getPriority = (ticket: TicketDetail) => {
    return ticket.priority || ticket.priorite || 'medium'
  }

  const getTitle = (ticket: TicketDetail) => {
    return ticket.subject || ticket.titre || `Ticket #${ticket.id}`
  }

  const getDescription = (ticket: TicketDetail) => {
    return ticket.description || 'No description provided'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ticket not found</h2>
        <p className="text-gray-600 mb-4">The ticket you're looking for doesn't exist or you don't have access to it.</p>
        <Link 
          href="/agentdashboard/my-tickets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Tickets
        </Link>
      </div>
    )
  }

  const status = getStatus(ticket)
  const priority = getPriority(ticket)
  const title = getTitle(ticket)
  const description = getDescription(ticket)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/agentdashboard/my-tickets"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">Ticket #{ticket.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href={`/agentdashboard/my-tickets/${ticketId}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Link>
          
          <div className="relative">
            <select 
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
            </div>
          </div>

          {/* Responses */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Responses ({responses.length})
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {responses.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No responses yet. Be the first to respond!</p>
                </div>
              ) : (
                responses.map((response) => {
                  const isCurrentUser = response.user_id === user?.id
                  
                  // Better name resolution logic
                  let displayName: string
                  if (isCurrentUser) {
                    displayName = user?.name || 'You'
                  } else {
                    // Try multiple sources for the user name
                    displayName = response.user?.name || 
                                 // If this is the client who created the ticket, use ticket client info
                                 (response.user_id === ticket?.client?.id ? `${ticket?.client?.name} (Client)` : null) ||
                                  // Last fallback
                                  'Unknown User'
                  }
                  
                  return (
                  <div key={response.id} className={`border-l-2 pl-4 ${isCurrentUser ? 'border-cyan-400 bg-cyan-50/30' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCurrentUser ? 'bg-cyan-100' : 'bg-gray-200'
                      }`}>
                        <User className={`w-4 h-4 ${isCurrentUser ? 'text-cyan-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-medium ${isCurrentUser ? 'text-cyan-900' : 'text-gray-900'}`}>
                            {displayName}
                            {isCurrentUser && <span className="text-xs text-cyan-600 ml-1">(You)</span>}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(response.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap mb-3">{response.message}</p>
                        
                        {/* Attachment Display */}
                        {response.attachment_path && response.attachment_name && (
                          <div className="mt-3">
                            <AttachmentDisplay
                              responseId={response.id}
                              attachmentName={response.attachment_name}
                              attachmentType={response.attachment_type || ''}
                              attachmentSize={response.attachment_size || undefined}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )})
              )}

              {/* Add Response Form */}
              <div className="border-t border-gray-200 pt-6">
                <div className="space-y-4">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your response..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  />
                  
                  {/* File Upload */}
                  <FileUploader
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                    className="w-full"
                  />
                  
                  <div className="flex items-center justify-end">
                    <button
                      onClick={handleAddResponse}
                      disabled={(!newMessage.trim() && !selectedFile) || responseLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {responseLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send Response
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                }`}>
                  {status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                  priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'
                }`}>
                  <AlertTriangle className="w-3 h-3" />
                  {priority.toUpperCase()}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                <span className="text-sm text-gray-900">
                  {ticket.category || 'General'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {new Date(ticket.updated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {ticket.client?.name || 'Unknown Client'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ticket.client?.email || 'No email'}
                  </p>
                </div>
              </div>
              
              {ticket.client?.department && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                  <span className="text-sm text-gray-900">{ticket.client?.department}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              {status !== 'resolved' && status !== 'closed' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Resolved
                </button>
              )}
              
              <button
                onClick={() => handleStatusChange('in_progress')}
                className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Mark as In Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
