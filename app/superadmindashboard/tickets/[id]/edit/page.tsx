'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Save,
  User,
  AlertCircle,
  Clock,
  CheckCircle,
  Users,
  FileText,
  MessageSquare,
  Tag,
  Edit3,
  Loader2
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Ticket {
  id: number
  titre: string
  description: string
  statut: string
  client_id?: number
  agentassigne_id?: number
  priorite: string
  category?: string
  created_at: string
  updated_at: string
  client?: User
  agentassigne?: User
}

interface UpdateTicketData {
  titre: string
  description: string
  statut: string
  client_id?: number
  agentassigne_id?: number
  priorite: string
  category?: string
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface Agent extends User {
  department?: string
}

// Fetch ticket by ID
async function fetchTicket(id: string): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch ticket: ${text}`)
  }
  const json = await res.json()
  return json.data ?? json
}

// Fetch clients (users with role 'client')
async function fetchClients(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/api/users?role=client`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch clients: ${text}`)
  }
  const json = await res.json()
  return json.data ?? json
}

// Fetch agents
async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/api/agents`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch agents: ${text}`)
  }
  const json = await res.json()
  return json.data ?? json
}

// Update ticket
async function updateTicket(id: string, data: UpdateTicketData) {
  const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(data)
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(errorData.message || `HTTP ${res.status}: Failed to update ticket`)
  }
  
  return res.json()
}

export default function EditTicketPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string
  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState<UpdateTicketData>({
    titre: '',
    description: '',
    statut: 'open',
    priorite: 'medium',
    category: ''
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Categories predefined list
  const categories = [
    'technical','billing','feature-request','bug-report','other'
  ]

  const statusOptions = [
    { value: 'open', label: 'Open', color: 'text-cyan-700 bg-cyan-50' },
    { value: 'in_progress', label: 'In Progress', color: 'text-yellow-700 bg-yellow-50' },
    { value: 'resolved', label: 'Resolved', color: 'text-green-700 bg-green-50' },
    { value: 'closed', label: 'Closed', color: 'text-gray-700 bg-gray-50' }
  ]

  useEffect(() => {
    setIsMounted(true)
  }, [])    


  // Fetch ticket data  
  const { data: ticket, isLoading: ticketLoading, error: ticketError } = useQuery<Ticket, Error>({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: isMounted && !!ticketId
  })

  // Fetch clients and agents
  const { data: clients, isLoading: clientsLoading } = useQuery<User[], Error>({
    queryKey: ['clients'],
    queryFn: fetchClients,
    enabled: isMounted
  })

  const { data: agents, isLoading: agentsLoading } = useQuery<Agent[], Error>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    enabled: isMounted
  })

  // Initialize form data when ticket is loaded
  useEffect(() => {
    if (ticket) {
      const initialData = {
        titre: ticket.titre,
        description: ticket.description,
        statut: ticket.statut,
        priorite: ticket.priorite,
        category: ticket.category || '',
        client_id: ticket.client_id,
        agentassigne_id: ticket.agentassigne_id
      }
      setFormData(initialData)
    }
  }, [ticket])

  // Update ticket mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateTicketData) => updateTicket(ticketId, data),
    onSuccess: (data) => {
      toast.success('Ticket updated successfully!')
      setHasChanges(false)
      router.push(`/superadmindashboard/tickets/${ticketId}`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update ticket')
    }
  })

  const handleInputChange = (field: keyof UpdateTicketData, value: string | number) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value === '' ? undefined : value
      }
      setHasChanges(true)
      return newData
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.titre.trim()) {
      toast.error('Title is required')
      return
    }
    if (!formData.description.trim()) {
      toast.error('Description is required')
      return
    }

    updateMutation.mutate(formData)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-cyan-600 bg-cyan-50 border-cyan-200'
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4" />
      case 'medium': return <Clock className="w-4 h-4" />
      case 'low': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(s => s.value === status)
    return statusOption?.color || 'text-gray-700 bg-gray-50'
  }

  if (!isMounted) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
  }

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-cyan-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading ticket...</span>
        </div>
      </div>
    )
  }

  if (ticketError || !ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Ticket not found</p>
          <p className="text-gray-600 mb-4">The ticket you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => router.push('/superadmindashboard/globaltickets')}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Edit3 className="w-6 h-6 text-cyan-600" />
              <h1 className="text-2xl font-bold text-gray-900">Edit Ticket #{ticket.id}</h1>
            </div>
            <p className="text-gray-600">Update ticket details and assignment</p>
            {hasChanges && (
              <p className="text-sm text-cyan-600 font-medium">• Unsaved changes</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/superadmindashboard/tickets/${ticketId}`)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            form="ticket-form"
            type="submit"
            disabled={updateMutation.status === 'pending' || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {updateMutation.status === 'pending' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Ticket Meta Info */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-600" />
              <span className="text-sm font-medium text-cyan-900">Ticket ID: #{ticket.id}</span>
            </div>
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              getStatusColor(ticket.statut)
            )}>
              {statusOptions.find(s => s.value === ticket.statut)?.label || ticket.statut}
            </div>
          </div>
          <div className="text-sm text-cyan-700">
            Created: {new Date(ticket.created_at).toLocaleDateString()}
            {ticket.updated_at !== ticket.created_at && (
              <span className="ml-2">• Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form id="ticket-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-cyan-500" />
                <h2 className="text-lg font-semibold text-gray-900">Ticket Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="titre" className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="titre"
                    value={formData.titre}
                    onChange={(e) => handleInputChange('titre', e.target.value)}
                    placeholder="Enter ticket title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={formData.category || ''}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the issue or request in detail..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-vertical"
                  />
                </div>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-cyan-500" />
                <h2 className="text-lg font-semibold text-gray-900">Assignment</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <select
                    id="client_id"
                    value={formData.client_id || ''}
                    onChange={(e) => handleInputChange('client_id', e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    disabled={clientsLoading}
                  >
                    <option value="">No client assigned</option>
                    {clients?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </select>
                  {clientsLoading && (
                    <p className="text-sm text-gray-500 mt-1">Loading clients...</p>
                  )}
                  {ticket.client && !formData.client_id && (
                    <p className="text-sm text-cyan-600 mt-1">
                      Currently: {ticket.client.name} ({ticket.client.email})
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="agentassigne_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Agent
                  </label>
                  <select
                    id="agentassigne_id"
                    value={formData.agentassigne_id || ''}
                    onChange={(e) => handleInputChange('agentassigne_id', e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    disabled={agentsLoading}
                  >
                    <option value="">Unassigned</option>
                    {agents?.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} {agent.department && `(${agent.department})`}
                      </option>
                    ))}
                  </select>
                  {agentsLoading && (
                    <p className="text-sm text-gray-500 mt-1">Loading agents...</p>
                  )}
                  {ticket.agentassigne && !formData.agentassigne_id && (
                    <p className="text-sm text-cyan-600 mt-1">
                      Currently: {ticket.agentassigne.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <label key={status.value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="statut"
                      value={status.value}
                      checked={formData.statut === status.value}
                      onChange={(e) => handleInputChange('statut', e.target.value)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-lg border-2 transition-all",
                      formData.statut === status.value
                        ? status.color + " border-cyan-300 ring-2 ring-cyan-200 ring-offset-1"
                        : "border-gray-200 hover:border-gray-300"
                    )}>
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        formData.statut === status.value ? "bg-cyan-500" : "bg-gray-300"
                      )} />
                      <span className="font-medium">{status.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Level</h3>
              <div className="space-y-2">
                {(['high', 'medium', 'low'] as const).map((priority) => (
                  <label key={priority} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="priorite"
                      value={priority}
                      checked={formData.priorite === priority}
                      onChange={(e) => handleInputChange('priorite', e.target.value)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-lg border-2 transition-all",
                      formData.priorite === priority
                        ? getPriorityColor(priority) + " ring-2 ring-offset-1"
                        : "border-gray-200 hover:border-gray-300"
                    )}>
                      {getPriorityIcon(priority)}
                      <span className="font-medium capitalize">{priority}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Help Text */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-cyan-900 mb-1">Editing Guidelines</h4>
                  <ul className="text-sm text-cyan-800 space-y-1">
                    <li>• Update status to reflect current progress</li>
                    <li>• Reassign to different agents if needed</li>
                    <li>• Adjust priority based on new information</li>
                    <li>• Add details to description as situation evolves</li>
                    <li>• Changes are tracked and logged automatically</li>
                  </ul>
                </div>
              </div>
            </div>

           
          </div>
        </div>
      </form>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-cyan-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">You have unsaved changes</span>
          </div>
        </div>
      )}
    </div>
  )
}