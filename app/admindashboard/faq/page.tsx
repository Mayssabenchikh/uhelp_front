'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageCircleQuestion, 
  Loader2,
  Calendar,
  User,
  Globe,
  AlertCircle,
  Trash2,
  Eye
} from 'lucide-react'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface PendingFaq {
  id: number
  question: string
  answer: string
  language: string
  status: 'pending' | 'approved' | 'rejected'
  user_id: number
  created_at: string
  updated_at: string
  raw_model_output?: string
  user?: {
    name: string
    email: string
  }
}

export default function AdminFaqPage() {
  const [pending, setPending] = useState<PendingFaq[]>([])
  const [loading, setLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
  const [selectedFaq, setSelectedFaq] = useState<PendingFaq | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const { t } = useTranslation()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/pending-faqs')
      setPending(res.data.data ?? res.data)
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to load pending FAQs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    setProcessingIds(prev => new Set(prev).add(id))
    try {
      await api.post(`/admin/pending-faqs/${id}/approve`)
      toast.success('FAQ approved successfully!')
      load()
    } catch (e: any) {
      toast.error('Failed to approve FAQ')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const reject = async (id: number) => {
    setProcessingIds(prev => new Set(prev).add(id))
    try {
      await api.post(`/admin/pending-faqs/${id}/reject`)
      toast.success('FAQ rejected successfully!')
      load()
    } catch (e: any) {
      toast.error('Failed to reject FAQ')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const deleteFaq = async (id: number) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return
    
    setProcessingIds(prev => new Set(prev).add(id))
    try {
      await api.delete(`/admin/pending-faqs/${id}`)
      toast.success('FAQ deleted successfully!')
      load()
    } catch (e: any) {
      toast.error('Failed to delete FAQ')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const openPreview = (faq: PendingFaq) => {
    setSelectedFaq(faq)
    setShowPreviewModal(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const parseJsonContent = (faq: PendingFaq) => {
    // Try to use raw_model_output first (contains the full generated FAQs)
    const contentToUse = faq.raw_model_output || faq.answer

    const tryParse = (text: string) => {
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }

    // Helper: extract JSON from fenced block or inline object/array
    const extractJsonCandidate = (text: string) => {
      if (!text) return null
      // match ```json ... ``` blocks
      const fence = text.match(/```json\s*([\s\S]*?)\s*```/i)
      if (fence && fence[1]) return fence[1].trim()
      // match any { ... } or [ ... ] (first occurrence)
      const inline = text.match(/(\[.*\]|\{.*\})/s)
      if (inline && inline[1]) return inline[1].trim()
      return null
    }

    // Try direct parse
    const direct = tryParse(contentToUse)
    const candidate = extractJsonCandidate(contentToUse)
    const fromCandidate = candidate ? tryParse(candidate) : null

    const parsed = direct || fromCandidate

    if (parsed) {
      // Handle array of FAQ objects
      if (Array.isArray(parsed)) {
        return (
          <div className="space-y-3">
            {parsed.map((item: any, index: number) => (
              <div key={index} className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border-l-4 border-cyan-400 shadow-sm">
                {item.question && (
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-cyan-100 text-cyan-800 rounded-full mr-2">Q</span>
                    <span className="text-gray-800 font-medium">{String(item.question)}</span>
                  </div>
                )}
                {item.answer && (
                  <div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full mr-2">A</span>
                    <span className="text-gray-700">{String(item.answer)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }

      // Handle single FAQ object with question and answer
      else if (parsed.question && parsed.answer) {
        return (
          <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border-l-4 border-cyan-400 shadow-sm">
            <div className="mb-2">
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-cyan-100 text-cyan-800 rounded-full mr-2">Q</span>
              <span className="text-gray-800 font-medium">{String(parsed.question)}</span>
            </div>
            <div>
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full mr-2">A</span>
              <span className="text-gray-700">{String(parsed.answer)}</span>
            </div>
          </div>
        )
      }

      // Handle single FAQ object with only answer (new AI format)
      else if (parsed.answer && !parsed.question) {
        return (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-400 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full mt-0.5">AI Answer</span>
              <div className="flex-1">
                <p className="text-gray-800 leading-relaxed">{String(parsed.answer)}</p>
              </div>
            </div>
          </div>
        )
      }

      // Other JSON structures - display formatted
      else if (typeof parsed === 'object') {
        return (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-xs font-medium text-yellow-800 mb-2">Raw JSON Output:</div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto bg-white p-2 rounded border">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        )
      }
    }

    // If no JSON parsed, show sanitized plain text: remove fences for readability
    const cleaned = String(contentToUse).replace(/```[\s\S]*?```/g, '').trim()
    return (
      <div className="p-3 bg-gray-50 rounded-lg border">
        <div className="text-xs font-medium text-gray-600 mb-2">Text Content:</div>
        <span className="text-gray-700 whitespace-pre-wrap">{cleaned || contentToUse}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading pending FAQs...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <MessageCircleQuestion className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">FAQ Management Center</h1>
          </div>
          <p className="text-cyan-100">Review and manage AI-generated FAQs pending approval</p>
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{pending.filter(p => p.status === 'pending').length} Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{pending.filter(p => p.status === 'approved').length} Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span>{pending.filter(p => p.status === 'rejected').length} Rejected</span>
            </div>
          </div>
        </div>

        {/* FAQs List */}
        {pending.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircleQuestion className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending FAQs</h3>
            <p className="text-gray-500">All FAQs have been reviewed and processed.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pending.map((faq) => (
              <div key={faq.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-50 rounded-lg">
                        <MessageCircleQuestion className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(faq.status)}
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                            <Globe className="w-3 h-3" />
                            {faq.language?.toUpperCase() || 'EN'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(faq.created_at)}
                          </span>
                          {faq.user && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {faq.user.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{faq.question}</h3>
                      <div className="text-gray-600 text-sm line-clamp-3">
                        {parseJsonContent(faq)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      onClick={() => openPreview(faq)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>

                    <div className="flex items-center gap-2">
                      {faq.status === 'pending' && (
                        <>
                          <button
                            onClick={() => reject(faq.id)}
                            disabled={processingIds.has(faq.id)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingIds.has(faq.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                          <button
                            onClick={() => approve(faq.id)}
                            disabled={processingIds.has(faq.id)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingIds.has(faq.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => deleteFaq(faq.id)}
                        disabled={processingIds.has(faq.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingIds.has(faq.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedFaq && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">FAQ Preview</h2>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  {getStatusBadge(selectedFaq.status)}
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                    <Globe className="w-3 h-3" />
                    {selectedFaq.language?.toUpperCase() || 'EN'}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Question</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedFaq.question}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Answer</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {parseJsonContent(selectedFaq)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Created</h4>
                    <p className="text-sm text-gray-600">{formatDate(selectedFaq.created_at)}</p>
                  </div>
                  {selectedFaq.user && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Created by</h4>
                      <p className="text-sm text-gray-600">{selectedFaq.user.name}</p>
                    </div>
                  )}
                </div>

                {selectedFaq.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        reject(selectedFaq.id)
                        setShowPreviewModal(false)
                      }}
                      disabled={processingIds.has(selectedFaq.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        approve(selectedFaq.id)
                        setShowPreviewModal(false)
                      }}
                      disabled={processingIds.has(selectedFaq.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
