'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Trash2,
  RotateCcw,
  X,
  Info,
  User,
  Filter
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import toast from 'react-hot-toast'

// Types
interface TrashedTicket {
  id: string
  ticket_id: string
  customer: {
    id?: string | number
    name: string
  }
  subject: string
  status: string
  assigned_agent?: { id: number; name: string } | null
  priority: 'low' | 'medium' | 'high'
  category?: string
  created_at: string
  deleted_at?: string | null
}

interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

interface TrashedTicketsResponse {
  data: TrashedTicket[]
  meta: PaginationMeta
}

// API Functions
async function fetchTrashedTickets(
  page: number = 1,
  perPage: number = 15,
  search: string = '',
  sort: string = 'created_at|desc',
  status?: string,
  priority?: string,
  category?: string,
  deletedFrom?: string,
  deletedTo?: string
): Promise<TrashedTicketsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    sort,
    ...(search && { q: search, search }), // q and search for compatibility
    ...(status && { status }),
    ...(priority && { priority }),
    ...(category && { category }),
    ...(deletedFrom && { deleted_from: deletedFrom }),
    ...(deletedTo && { deleted_to: deletedTo }),
  })

  const res = await fetch(`${API_BASE}/api/tickets/trashed?${params.toString()}`, {
    headers: getAuthHeaders(),
  })

  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    if (res.status === 404 || (json && typeof json.message === 'string' && /No query results for model/i.test(json.message))) {
      return {
        data: [],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: 0,
          from: null,
          to: null
        }
      }
    }
    throw new Error(`Failed to fetch trashed tickets: ${text}`)
  }

  return (json as TrashedTicketsResponse)
}

async function restoreTicket(ticketId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(true),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`Failed to restore ticket: ${text}`)
  return JSON.parse(text || '{}')
}

async function bulkRestoreTickets(ticketIds: string[]): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/tickets/trashed/restore`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ ids: ticketIds.map(id => parseInt(id)) }),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`Failed to bulk restore tickets: ${text}`)
  return JSON.parse(text || '{}')
}

async function forceDeleteTicket(ticketId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/force`, {
    method: 'DELETE',
    headers: getAuthHeaders(true),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`Failed to permanently delete ticket: ${text}`)
  return JSON.parse(text || '{}')
}

async function bulkForceDeleteTickets(ticketIds: string[]): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/tickets/trashed`, {
    method: 'DELETE',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ ids: ticketIds.map(id => parseInt(id)) }),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`Failed to bulk delete tickets: ${text}`)
  return JSON.parse(text || '{}')
}

/**
 * autoCleanOldRequest:
 * Essaie plusieurs chemins plausibles pour l'endpoint d'auto-clean côté API.
 * Retourne l'objet JSON renvoyé par le serveur en cas de succès.
 */
async function autoCleanOldRequest(days = 30): Promise<any> {
  const candidatePaths = [
    '/api/tickets/trashed/autoclean',
    '/api/tickets/trashed/auto-clean',
    '/api/tickets/trashed/auto_clean',
    '/api/tickets/trashed/auto-clean-old',
    '/api/tickets/trashed/autoClean',
    '/api/tickets/trashed/auto_clean_old'
  ];

  let lastError: any = null;

  for (const path of candidatePaths) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(true),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days }),
      });

      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null } catch { json = null }

      if (res.ok) {
        return json;
      }

      // 404 -> essayer le prochain path
      if (res.status === 404) {
        lastError = { message: `Not found: ${path}`, status: 404 }
        continue;
      }

      // autre statut -> lever erreur
      throw new Error(json?.message || `Auto-clean failed (status ${res.status})`);
    } catch (err: any) {
      lastError = err;
      // si erreur réseau ou autre, on continue d'essayer d'autres candidats
      continue;
    }
  }

  // Si on arrive ici, toutes les tentatives ont échoué
  throw new Error(lastError?.message || 'Auto-clean endpoint not found. Vérifie tes routes API.');
}

export default function TrashedTicketsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Live form states
  const [rawSearchTerm, setRawSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [priorityFilter, setPriorityFilter] = useState('All Priority')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Extra filters
  const [deletedFrom, setDeletedFrom] = useState<string>('')
  const [deletedTo, setDeletedTo] = useState<string>('')
  const [sort, setSort] = useState<string>('created_at|desc')

  const queryClient = useQueryClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Debounce searchTerm (500ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(rawSearchTerm.trim())
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(t)
  }, [rawSearchTerm])

  // Listen to header search events from AdminLayout
  useEffect(() => {
    const handleHeaderSearch = (event: Event) => {
      const custom = event as CustomEvent<{ term?: string }>
      const term = custom.detail?.term || ''
      setRawSearchTerm(term)
      setCurrentPage(1)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('globalTicketsSearch', handleHeaderSearch as EventListener)
      return () => window.removeEventListener('globalTicketsSearch', handleHeaderSearch as EventListener)
    }
  }, [])

  /**
   * === Nouvel useEffect: écoute l'événement 'trashedTicketsAutoClean'
   * Quand on reçoit l'événement, on appelle l'API d'auto-clean et on rafraîchit la liste.
   */
  useEffect(() => {
    const handleAutoCleanEvent = (event: Event) => {
      const custom = event as CustomEvent<{ days?: number }>
      const days = custom?.detail?.days ?? 30

      // exécution asynchrone (IIFE)
      ;(async () => {
        const toastId = toast.loading('Auto-clean en cours…')
        try {
          const result = await autoCleanOldRequest(days)
          toast.dismiss(toastId)
          const deleted = result?.deleted ?? result?.deleted_count ?? 0
          toast.success(`Auto-clean terminé — ${deleted} élément(s) supprimé(s)`)
          // rafraîchir la liste
          queryClient.invalidateQueries({ queryKey: ['trashedTickets'] })
        } catch (err: any) {
          toast.dismiss(toastId)
          toast.error(err?.message || 'Échec de l\'auto-clean')
        }
      })()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('trashedTicketsAutoClean', handleAutoCleanEvent as EventListener)
      return () => window.removeEventListener('trashedTicketsAutoClean', handleAutoCleanEvent as EventListener)
    }
  }, [queryClient])

  // Mappers (UI label -> API param)
  const mapStatusToParam = (label: string) => {
    if (!label || label === 'All Status') return undefined
    const map: Record<string, string> = {
      'Open': 'open',
      'In Progress': 'in_progress',
      'Resolved': 'resolved',
      'Closed': 'closed'
    }
    return map[label] ?? label.toLowerCase().replace(/\s+/g, '_')
  }

  const mapPriorityToParam = (label: string) => {
    if (!label || label === 'All Priority') return undefined
    return label.toLowerCase()
  }

  const mapCategoryToParam = (label: string) => {
    if (!label || label === 'All Categories') return undefined
    const map: Record<string, string> = {
      'Technical': 'technical',
      'Account': 'account',
      'Billing': 'billing',
      'Feature Request': 'feature_request',
      'Spam': 'spam'
    }
    return map[label] ?? label.toLowerCase().replace(/\s+/g, '_')
  }

  const statusParam = mapStatusToParam(statusFilter)
  const priorityParam = mapPriorityToParam(priorityFilter)
  const categoryParam = mapCategoryToParam(categoryFilter)

  // determine if any filter is active (to enable/disable Clear)
  const filtersActive =
    !!(
      rawSearchTerm ||
      statusParam ||
      priorityParam ||
      categoryParam ||
      deletedFrom ||
      deletedTo ||
      (sort && sort !== 'created_at|desc')
    )

  // Query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<TrashedTicketsResponse, Error, TrashedTicketsResponse>({
    queryKey: [
      'trashedTickets',
      currentPage,
      debouncedSearch,
      statusParam,
      priorityParam,
      categoryParam,
      deletedFrom || null,
      deletedTo || null,
      sort
    ],
    queryFn: () => fetchTrashedTickets(
      currentPage,
      15,
      debouncedSearch,
      sort,
      statusParam,
      priorityParam,
      categoryParam,
      deletedFrom || undefined,
      deletedTo || undefined
    ),
    enabled: isMounted,
    placeholderData: (previousData) => previousData,
  })

  // Mutations
  const restoreMutation = useMutation<unknown, Error, string>({
    mutationFn: (id: string) => restoreTicket(id),
    onSuccess: () => {
      toast.success('Ticket restored successfully')
      queryClient.invalidateQueries({ queryKey: ['trashedTickets'] })
      setSelectedTickets([])
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to restore ticket')
    }
  })

  const bulkRestoreMutation = useMutation<unknown, Error, string[]>({
    mutationFn: (ids: string[]) => bulkRestoreTickets(ids),
    onSuccess: () => {
      toast.success('Tickets restored successfully')
      queryClient.invalidateQueries({ queryKey: ['trashedTickets'] })
      setSelectedTickets([])
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to restore tickets')
    }
  })

  const forceDeleteMutation = useMutation<unknown, Error, string>({
    mutationFn: (id: string) => forceDeleteTicket(id),
    onSuccess: () => {
      toast.success('Ticket permanently deleted')
      queryClient.invalidateQueries({ queryKey: ['trashedTickets'] })
      setSelectedTickets([])
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete ticket')
    }
  })

  const bulkForceDeleteMutation = useMutation<unknown, Error, string[]>({
    mutationFn: (ids: string[]) => bulkForceDeleteTickets(ids),
    onSuccess: () => {
      toast.success('Tickets permanently deleted')
      queryClient.invalidateQueries({ queryKey: ['trashedTickets'] })
      setSelectedTickets([])
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete tickets')
    }
  })

  // Helpers
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB')
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-red-500 text-white'
      case 'in_progress': return 'bg-yellow-500 text-white'
      case 'resolved': return 'bg-green-500 text-white'
      case 'closed': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getCategoryDisplay = (category?: string) => {
    if (!category) return '—'
    return category.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
  }

  const handleSelectAll = () => {
    const allTicketIds: string[] = data?.data.map((t: TrashedTicket) => t.id) || []
    setSelectedTickets(
      selectedTickets.length === allTicketIds.length ? [] : allTicketIds
    )
  }

  const handleBulkRestore = () => {
    if (selectedTickets.length === 0) return
    if (confirm(`Are you sure you want to restore ${selectedTickets.length} ticket(s)?`)) {
      bulkRestoreMutation.mutate(selectedTickets)
    }
  }

  const handleBulkForceDelete = () => {
    if (selectedTickets.length === 0) return
    if (confirm(`Are you sure you want to permanently delete ${selectedTickets.length} ticket(s)? This action cannot be undone.`)) {
      bulkForceDeleteMutation.mutate(selectedTickets)
    }
  }

  const handleClearFilters = () => {
    setRawSearchTerm('')
    setDebouncedSearch('')
    setStatusFilter('All Status')
    setPriorityFilter('All Priority')
    setCategoryFilter('All Categories')
    setDeletedFrom('')
    setDeletedTo('')
    setSort('created_at|desc')
    setCurrentPage(1)
    setSelectedTickets([])
    queryClient.invalidateQueries({ queryKey: ['trashedTickets'] })
    toast.success('Filters cleared')
  }

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading trashed tickets...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600 mb-4">
          Error: {(error as any)?.message || 'Failed to load trashed tickets'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
        >
          Retry
        </button>
      </div>
    )
  }

  const tickets: TrashedTicket[] = data?.data || []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Auto-deletion policy</p>
          <p>Tickets in trash will be automatically deleted after 30 days. You can restore tickets to bring them back to active status or permanently delete them immediately.</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tickets by ID, subject, or client..."
              value={rawSearchTerm}
              onChange={(e) => {
                setRawSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            />
          </div>

          {/* Filter Dropdowns */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
          >
            <option>All Status</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
          >
            <option>All Priority</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
          >
            <option>All Categories</option>
            <option>Technical</option>
            <option>Account</option>
            <option>Billing</option>
            <option>Feature Request</option>
            <option>Spam</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedTickets.length > 0 && (
          <div className="flex items-center justify-between bg-cyan-50 rounded-md p-3 mb-4">
            <span className="text-sm text-gray-700">
              {selectedTickets.length} ticket(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkRestore}
                disabled={bulkRestoreMutation.status === 'pending'}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 text-white rounded-md text-sm hover:bg-cyan-600 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Restore
              </button>
              <button
                onClick={handleBulkForceDelete}
                disabled={bulkForceDeleteMutation.status === 'pending'}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Forever
              </button>
            </div>
          </div>
        )}

        {/* Results Count and More Filters + Clear */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Trashed Tickets ({meta?.total || 0})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              <Filter className="w-4 h-4" />
              More Filters
            </button>

            <button
              onClick={handleClearFilters}
              disabled={!filtersActive}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              title="Clear all filters"
            >
              <X className="w-4 h-4 text-gray-600" />
              Clear
            </button>
          </div>
        </div>

        {/* More Filters Panel */}
        {showMoreFilters && (
          <div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Deleted from</label>
                <input
                  type="date"
                  value={deletedFrom}
                  onChange={(e) => { setDeletedFrom(e.target.value); setCurrentPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Deleted to</label>
                <input
                  type="date"
                  value={deletedTo}
                  onChange={(e) => { setDeletedTo(e.target.value); setCurrentPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sort</label>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setCurrentPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="created_at|desc">Newest deleted</option>
                  <option value="created_at|asc">Oldest deleted</option>
                  <option value="priority|desc">Priority (high → low)</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => { queryClient.invalidateQueries({ queryKey: ['trashedTickets'] }); toast.success('Filters applied'); }}
                  className="px-3 py-2 bg-cyan-500 text-white rounded-md text-sm hover:bg-cyan-600"
                >
                  Apply
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={tickets.length > 0 && selectedTickets.length === tickets.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deleted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket: TrashedTicket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTickets.includes(ticket.id)}
                      onChange={() => handleSelectTicket(ticket.id)}
                      className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("inline-flex px-2 py-1 text-xs font-semibold rounded-full", getPriorityColor(ticket.priority))}>
                      {ticket.priority ? (ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ticket.ticket_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={ticket.subject}>
                      {ticket.subject}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("inline-flex px-2 py-1 text-xs font-semibold rounded-full", getStatusColor(ticket.status))}>
                      {ticket.status ? (ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('_', ' ')) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {ticket.customer?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getCategoryDisplay(ticket.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {ticket.assigned_agent?.name || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreMutation.mutate(ticket.id)}
                        disabled={restoreMutation.status === 'pending'}
                        className="text-cyan-600 hover:text-cyan-800 disabled:opacity-50"
                        title="Restore ticket"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to permanently delete this ticket? This action cannot be undone.')) {
                            forceDeleteMutation.mutate(ticket.id)
                          }
                        }}
                        disabled={forceDeleteMutation.status === 'pending'}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Delete permanently"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {tickets.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Trash2 className="w-12 h-12 text-gray-300" />
                      <p>No trashed tickets found</p>
                      {rawSearchTerm && (
                        <p className="text-sm">Try adjusting your search criteria</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {meta.from ?? 0} to {meta.to ?? 0} of {meta.total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => {
                  let pageNum = i + 1
                  if (meta.last_page > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 2 + i
                      if (pageNum > meta.last_page) {
                        pageNum = meta.last_page - 4 + i
                      }
                    }
                  }
                  
                  if (pageNum < 1) pageNum = 1
                  if (pageNum > meta.last_page) pageNum = meta.last_page
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "px-3 py-2 border rounded-lg",
                        currentPage === pageNum
                          ? "bg-cyan-500 text-white border-cyan-500"
                          : "border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(meta.last_page, prev + 1))}
                disabled={currentPage === meta.last_page}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
