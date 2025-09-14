'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Save, Edit3, Loader2, AlertCircle } from 'lucide-react'
import { ticketService } from '@/services/api'
import { useAppContext } from '@/context/Context'

interface UpdateTicketData {
  subject?: string
  titre?: string
  description: string
  priorite: string
  priority?: string
}

export default function EditTicketPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string
  const { user } = useAppContext()
  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState<UpdateTicketData>({
    titre: '',
    description: '',
    priorite: 'medium'
  })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch ticket data
  const { data: ticketRes, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketService.getById(ticketId),
    enabled: isMounted && !!ticketId
  })

  const ticket = ticketRes?.data

  // Initialize form when ticket data is loaded
  useEffect(() => {
    if (ticket) {
      const initialData = {
        titre: ticket.subject || ticket.titre || '',
        description: ticket.description || '',
        priorite: ticket.priority || ticket.priorite || 'medium'
      }
      setFormData(initialData)
    }
  }, [ticket])

  // Update ticket mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateTicketData) => ticketService.update(ticketId, data),
    onSuccess: () => {
      setHasChanges(false)
      router.push(`/clientdashboard/tickets/${ticketId}`)
    },
    onError: (error: any) => {
      console.error('Failed to update ticket:', error)
    }
  })

  const handleInputChange = (field: keyof UpdateTicketData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-gray-700 bg-gray-50', icon: '⚪' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-700 bg-yellow-50', icon: '🟡' },
    { value: 'high', label: 'High', color: 'text-red-700 bg-red-50', icon: '🔴' },
    { value: 'urgent', label: 'Urgent', color: 'text-purple-700 bg-purple-50', icon: '🟣' }
  ]

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    )
  }

  if (ticketError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Ticket</h3>
              <p className="text-red-700">
                {ticketError instanceof Error ? ticketError.message : 'Failed to load ticket'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading ticket...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push(`/clientdashboard/tickets/${ticketId}`)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ticket
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Edit3 className="h-7 w-7 text-cyan-600" />
            Edit Ticket
          </h1>
          <p className="text-gray-600 mt-1">Update your ticket details</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Ticket Information</h2>
          <p className="text-gray-600 mt-1">Modify the fields you want to update</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Subject/Title */}
          <div>
            <label htmlFor="titre" className="block text-sm font-semibold text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              id="titre"
              value={formData.titre}
              onChange={(e) => handleInputChange('titre', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter ticket subject"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all duration-200"
              placeholder="Describe your issue in detail..."
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priorite" className="block text-sm font-semibold text-gray-700 mb-2">
              Priority
            </label>
            <select
              id="priorite"
              value={formData.priorite}
              onChange={(e) => handleInputChange('priorite', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current Status (Read-only info) */}
          <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Current Status
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm px-3 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {ticket?.status || ticket?.statut || 'Open'}
              </span>
              <span className="text-sm text-gray-500">
                (Status can only be changed by support agents)
              </span>
            </div>
          </div>

          {/* Error Display */}
          {updateMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 text-sm font-medium">
                  {updateMutation.error instanceof Error 
                    ? updateMutation.error.message 
                    : 'Failed to update ticket'}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.push(`/clientdashboard/tickets/${ticketId}`)}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !hasChanges}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
