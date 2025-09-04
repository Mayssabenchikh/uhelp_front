'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Tag
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CreateTicketData {
  titre: string
  description: string
  statut?: string
  client_id?: number
  agentassigne_id?: number
  priorite?: string
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

// Create ticket
async function createTicket(data: CreateTicketData) {
  const res = await fetch(`${API_BASE}/api/tickets`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(data)
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(errorData.message || `HTTP ${res.status}: Failed to create ticket`)
  }
  
  return res.json()
}

export default function NewTicketPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState<CreateTicketData>({
    titre: '',
    description: '',
    statut: 'open',
    priorite: 'medium',
    category: ''
  })

  // Categories predefined list
  const categories = [
    'technical','billing','feature-request','bug-report','other'
  ]

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch data
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

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (data) => {
      toast.success('Ticket created successfully!')
      router.push(`/admindashboard/tickets/${data.id}`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create ticket')
    }
  })

  const handleInputChange = (field: keyof CreateTicketData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }))
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

    createMutation.mutate(formData)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
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

  if (!isMounted) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
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
            <h1 className="text-2xl font-bold text-gray-900">Create New Ticket</h1>
            <p className="text-gray-600">Fill in the details below to create a new support ticket</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admindashboard/globaltickets')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            form="ticket-form"
            type="submit"
            disabled={createMutation.status === 'pending'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {createMutation.status === 'pending' ? 'Creating...' : 'Create Ticket'}
          </button>
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
                <FileText className="w-5 h-5 text-gray-400" />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select category </option>
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
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                  />
                </div>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-400" />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={clientsLoading}
                  >
                    <option value="">Select client (optional)</option>
                    {clients?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </select>
                  {clientsLoading && (
                    <p className="text-sm text-gray-500 mt-1">Loading clients...</p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={agentsLoading}
                  >
                    <option value="">Assign later</option>
                    {agents?.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} {agent.department && `(${agent.department})`}
                      </option>
                    ))}
                  </select>
                  {agentsLoading && (
                    <p className="text-sm text-gray-500 mt-1">Loading agents...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            

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

            {/* Status */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Initial Status</h3>
              <select
                value={formData.statut}
                onChange={(e) => handleInputChange('statut', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Tips for creating tickets</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Be specific and descriptive in your title</li>
                    <li>• Select the appropriate category for better organization</li>
                    <li>• Include relevant details in the description</li>
                    <li>• Set appropriate priority based on urgency</li>
                    <li>• Assign to an agent if you know who should handle it</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}