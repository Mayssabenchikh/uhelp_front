'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import {
  ArrowLeft,
  Save,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateTicketData {
  titre: string
  description: string
  statut?: string
  priorite?: string
  category?: string
}

interface TicketResponse {
  id: number
  titre: string
  description: string
  statut: string
  priorite: string
  category?: string
  created_at: string
  updated_at: string
}

const categories = ['technical', 'billing', 'feature-request', 'bug-report', 'other']

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

export default function CreateTicketPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<CreateTicketData>({
    titre: '',
    description: '',
    statut: 'open',
    priorite: 'medium',
    category: ''
  })

  const createMutation = useMutation<TicketResponse, Error, CreateTicketData>({
    mutationFn: createTicket,
    onSuccess: () => {
      toast.success('Ticket created successfully!')
      router.push('/clientdashboard/tickets')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create ticket')
    }
  })

  const handleInputChange = (field: keyof CreateTicketData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.titre.trim()) { toast.error('Title is required'); return }
    if (!formData.description.trim()) { toast.error('Description is required'); return }
    createMutation.mutate(formData)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50/80 border-red-200 backdrop-blur-sm'
      case 'medium': return 'text-cyan-600 bg-cyan-50/80 border-cyan-200 backdrop-blur-sm'
      case 'low': return 'text-slate-600 bg-slate-50/80 border-slate-200 backdrop-blur-sm'
      default: return 'text-slate-600 bg-slate-50/80 border-slate-200 backdrop-blur-sm'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-cyan-700 bg-clip-text text-transparent">
                Create New Ticket
              </h1>
              <p className="text-slate-600 mt-1">Fill in the details below to create a new support ticket</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              form="ticket-form"
              type="submit"
              disabled={createMutation.status === 'pending'}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 disabled:hover:shadow-lg"
            >
              <Save className="w-4 h-4" />
              {createMutation.status === 'pending' ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </div>

        {/* Form */}
        <form id="ticket-form" onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ticket Information */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-8 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Ticket Information</h2>
                </div>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="titre" className="block text-sm font-semibold text-slate-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="titre"
                      value={formData.titre}
                      onChange={(e) => handleInputChange('titre', e.target.value)}
                      placeholder="Enter a descriptive title for your ticket..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80"
                      maxLength={255}
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      value={formData.category || ''}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe the issue or request in detail..."
                      rows={8}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 resize-vertical min-h-[120px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Priority */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-all duration-200">
                <h3 className="text-lg font-bold text-slate-900 mb-5">Priority Level</h3>
                <div className="space-y-3">
                  {(['high', 'medium', 'low'] as const).map((priority) => (
                    <label key={priority} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="priorite"
                        value={priority}
                        checked={formData.priorite === priority}
                        onChange={(e) => handleInputChange('priorite', e.target.value)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 group-hover:scale-[1.02]",
                        formData.priorite === priority
                          ? getPriorityColor(priority) + " ring-2 ring-cyan-500/30 shadow-md"
                          : "border-slate-200/60 hover:border-slate-300 bg-white/50 hover:bg-white/80"
                      )}>
                        {getPriorityIcon(priority)}
                        <span className="font-semibold capitalize">{priority}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-all duration-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Initial Status</h3>
                <select
                  value={formData.statut}
                  onChange={(e) => handleInputChange('statut', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 font-medium"
                >
                  <option value="open">🔓 Open</option>
                  <option value="in_progress">⏳ In Progress</option>
                  <option value="resolved">✅ Resolved</option>
                  <option value="closed">🔒 Closed</option>
                </select>
              </div>

              {/* Tips Card */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 backdrop-blur-sm rounded-2xl border border-cyan-200/50 p-6">
                <h4 className="font-bold text-cyan-800 mb-3">💡 Tips for Better Support</h4>
                <ul className="text-sm text-cyan-700 space-y-2">
                  <li>• Be specific about the issue</li>
                  <li>• Include steps to reproduce</li>
                  <li>• Mention your environment</li>
                  <li>• Attach relevant screenshots</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}