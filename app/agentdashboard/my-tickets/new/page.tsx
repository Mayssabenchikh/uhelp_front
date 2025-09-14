'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Save,
  FileText,
  Users,
  AlertCircle,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import { useAppContext } from '@/context/Context'
import toast from 'react-hot-toast'

// --- Interfaces ---
interface CreateTicketData {
  titre: string
  description: string
  statut?: string
  client_id?: number
  agentassigne_id?: number
  priorite?: string
  category?: string
}

interface TicketResponse {
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
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

// --- Fetch clients (users with role 'client') ---
async function fetchClients(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/api/users?role=client`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch clients: ${await res.text()}`)
  }
  const json = await res.json()
  return json.data ?? json
}

// --- Create ticket ---
async function createTicket(data: CreateTicketData): Promise<TicketResponse> {
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

export default function AgentNewTicketPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientIdFromUrl = searchParams.get('client_id')
  const { user } = useAppContext() // agent connecté

  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState<CreateTicketData>({
    titre: '',
    description: '',
    statut: 'open',
    priorite: 'medium',
    category: '',
    client_id: clientIdFromUrl ? parseInt(clientIdFromUrl) : undefined,
    agentassigne_id: user?.id // assigné automatiquement
  })

  const categories = ['technical', 'billing', 'feature-request', 'bug-report', 'other']

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch clients
  const { data: clients, isLoading: clientsLoading } = useQuery<User[], Error>({
    queryKey: ['clients'],
    queryFn: fetchClients,
    enabled: isMounted
  })

  // Create ticket mutation
  const createMutation = useMutation<TicketResponse, Error, CreateTicketData>({
    mutationFn: createTicket,
    onSuccess: (data) => {
      toast.success('Ticket created successfully!')
      router.push(`/agentdashboard/my-tickets/${data.id}`)
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
    
    if (!formData.titre.trim()) {
      toast.error('Title is required')
      return
    }
    if (!formData.description.trim()) {
      toast.error('Description is required')
      return
    }

    // injecter l'agent connecté
    if (user?.id) {
      formData.agentassigne_id = user.id
    }

    createMutation.mutate(formData)
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
            onClick={() => router.push('/agentdashboard/my-tickets')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            form="ticket-form"
            type="submit"
            disabled={createMutation.status === 'pending'}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-vertical"
                  />
                </div>
              </div>
            </div>

            {/* Client Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Assign Client</h2>
              </div>
              
              <select
                id="client_id"
                value={formData.client_id || ''}
                onChange={(e) => handleInputChange('client_id', e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                disabled={clientsLoading || !!clientIdFromUrl}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
