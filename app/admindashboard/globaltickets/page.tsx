'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Filter,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Edit3,
  Trash2,
  Eye,
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'

/* ---------- Types (d'après ton export) ---------- */
export interface UserShort {
  id: number
  name: string
  department?: string | null
}

export interface Ticket {
  id: string
  ticket_id: string
  subject: string
  status: string
  priority: string
  category?: string | null
  created_at: string
  client: UserShort
  assigned_agent?: UserShort | null
}

type PaginatedResponse<T> = {
  data: T[]
  total: number
  per_page: number
  current_page: number
}

/* ---------- Network helpers ---------- */
async function fetchTickets(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
  const headers = getAuthHeaders()
  const qp = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) qp.append(k, String(v))
    })
  }
  const url = `${API_BASE}/api/tickets${qp.toString() ? `?${qp.toString()}` : ''}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to fetch tickets (${res.status}): ${text}`)
  }
  return res.json()
}

async function fetchAgents(): Promise<UserShort[]> {
  const res = await fetch(`${API_BASE}/api/agents`, { headers: getAuthHeaders() })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to fetch agents: ${text}`)
  }
  const json = await res.json()
  return (json.data ?? json) as UserShort[]
}

async function assignAgentApi(ticketId: string | number, agentId: number | string) {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ agent_id: Number(agentId) }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to assign agent (${res.status}): ${text}`)
  }
  return res.json()
}

async function deleteTicketApi(ticketId: string | number) {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to delete ticket (${res.status}): ${text}`)
  }
  return res.json()
}

/* ---------- Component ---------- */
export default function GlobalTicketsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assignedAgent: '',
  })
  const [isSelectingAllResults, setIsSelectingAllResults] = useState(false)
  const [isPerformingBulk, setIsPerformingBulk] = useState(false)

  // client-side search (debounced input)
  const [searchInput, setSearchInput] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')

  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => setIsMounted(true), [])

  // sync initial 'search' or 'q' param into local search (do not send immediately — debounce will)
  useEffect(() => {
    const q = searchParams?.get('search') ?? searchParams?.get('q') ?? ''
    if (q) setSearchInput(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(id)
  }, [searchInput])

  // reset page when search (server-side) or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filters.status, filters.priority, filters.category, filters.assignedAgent])

  // server query params (we now SEND search to server as 'search' — ton backend le gère)
  const serverQueryParams = useMemo(() => {
    const p: Record<string, any> = { page: currentPage, per_page: 10 }
    if (filters.status) p.status = filters.status
    if (filters.priority) p.priority = filters.priority
    if (filters.category) p.category = filters.category
    if (filters.assignedAgent) p.assigned_agent = filters.assignedAgent
    if (debouncedSearch) p.search = debouncedSearch // <-- envoi de la recherche au backend (nom 'search' compatible avec ton controller)
    return p
  }, [currentPage, filters, debouncedSearch])

  // ---------- react-query ----------
  const ticketsQuery = useQuery<PaginatedResponse<any>, Error>({
    queryKey: ['tickets', JSON.stringify(serverQueryParams)],
    queryFn: () => fetchTickets(serverQueryParams),
    staleTime: 1000 * 30,
    enabled: !!isMounted,
  })

  const agentsQuery = useQuery<UserShort[], Error>({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(),
    staleTime: 1000 * 60 * 5,
    enabled: !!isMounted,
  })

  const ticketsData = ticketsQuery.data
  const isLoading = ticketsQuery.isFetching || ticketsQuery.isLoading
  const error = ticketsQuery.error
  const refetch = ticketsQuery.refetch

  const agents = agentsQuery.data ?? []

  const assignMutation = useMutation({
    mutationFn: ({ ticketId, agentId }: { ticketId: string; agentId: number }) => assignAgentApi(ticketId, agentId),
    onSuccess: () => {
      toast.success('Agent assigned successfully')
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to assign agent')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (ticketId: string) => deleteTicketApi(ticketId),
    onSuccess: () => {
      toast.success('Ticket deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete ticket')
    }
  })

  const safeLower = (v?: any) => (typeof v === 'string' && v.length) ? v.toLowerCase() : ''

  const getStatusColor = (status?: string) => {
    const s = safeLower(status)
    switch (s) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-50 text-gray-400 border-gray-100'
    }
  }

  const getPriorityColor = (priority?: string) => {
    const p = safeLower(priority)
    switch (p) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-blue-600 bg-blue-50'
      case 'low': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-400 bg-transparent'
    }
  }

  const getPriorityIcon = (priority?: string): React.ReactNode => {
    const p = safeLower(priority)
    switch (p) {
      case 'high': return <AlertCircle className="w-4 h-4" />
      case 'medium': return <Clock className="w-4 h-4" />
      case 'low': return <CheckCircle className="w-4 h-4" />
      default: return null
    }
  }

  /* ---------- Normalizer (identique à ton code) ---------- */
  const normalizeTicket = (raw: any): Ticket => {
    const clientCandidate = raw.client ?? raw.customer ?? raw.client_id ? raw.client : null
    const client: UserShort = clientCandidate
      ? {
          id: Number(clientCandidate.id ?? clientCandidate.client_id ?? 0),
          name: clientCandidate.name ?? clientCandidate.email ?? '—',
          department: (clientCandidate.department ?? null),
        }
      : { id: 0, name: '—' }

    let assigned_agent: UserShort | null = null
    if (raw.assigned_agent && typeof raw.assigned_agent === 'object') {
      assigned_agent = {
        id: Number(raw.assigned_agent.id ?? raw.assigned_agent.user_id ?? 0),
        name: raw.assigned_agent.name ?? '—',
        department: raw.assigned_agent.department ?? null,
      }
    } else if (raw.agent && typeof raw.agent === 'object') {
      assigned_agent = {
        id: Number(raw.agent.id ?? raw.agent.user_id ?? 0),
        name: raw.agent.name ?? '—',
        department: raw.agent.department ?? null,
      }
    } else if (raw.agentassigne_id) {
      const found = agents.find(a => Number(a.id) === Number(raw.agentassigne_id))
      if (found) assigned_agent = { id: found.id, name: found.name, department: found.department ?? null }
      else assigned_agent = null
    } else if (raw.raw?.agentassigne_id) {
      const found = agents.find(a => Number(a.id) === Number(raw.raw.agentassigne_id))
      if (found) assigned_agent = { id: found.id, name: found.name, department: found.department ?? null }
      else assigned_agent = null
    }

    let ticket_id = raw.ticket_id ?? raw.TicketId ?? null
    if (!ticket_id) {
      const numericId = raw.id ?? raw.ticket_id ?? raw.raw?.id ?? null
      if (numericId != null) {
        const n = Number(numericId)
        if (!Number.isNaN(n)) ticket_id = `TK-${String(n).padStart(3, '0')}`
        else ticket_id = String(n)
      } else {
        ticket_id = '—'
      }
    }

    const subject = raw.subject ?? raw.titre ?? raw.title ?? '—'
    const status = raw.status ?? raw.statut ?? raw.state ?? '—'
    const priority = raw.priority ?? raw.priorite ?? raw.level ?? ''
    const created_at = raw.created_at ?? raw.createdAt ?? raw.createdAtISO ?? (new Date().toISOString())
    const category = raw.category ?? raw.raw?.category ?? null

    return {
      id: String(raw.id ?? raw.ticket_id ?? ticket_id ?? ''),
      ticket_id: String(ticket_id ?? '—'),
      subject: String(subject ?? '—'),
      status: String(status ?? '—'),
      priority: String(priority ?? ''),
      category: category ?? null,
      created_at: String(created_at ?? new Date().toISOString()),
      client,
      assigned_agent,
    }
  }

  // helper to display either a formatted value or an em-dash (modern & clean)
  const displayOrDash = (value?: string) => (value && String(value).trim() ? value : '—')

  // ---------- Build normalized tickets (used everywhere) ----------
  const normalizedTickets: Ticket[] = useMemo(() => {
    const rawArr = (ticketsData?.data ?? []) as any[]
    return rawArr.map(r => normalizeTicket(r))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketsData, agents])

  // ---------- Selection helpers ----------
  const handleSelectAll = () => {
    const currentTickets = normalizedTickets
    if (selectedTickets.size === currentTickets.length && currentTickets.length > 0) {
      setSelectedTickets(new Set())
      setIsSelectingAllResults(false)
    } else {
      setSelectedTickets(new Set(currentTickets.map(t => t.id)))
      setIsSelectingAllResults(false)
    }
  }

  const handleSelectTicket = (ticketId: string) => {
    const newSelected = new Set(selectedTickets)
    if (newSelected.has(ticketId)) newSelected.delete(ticketId)
    else newSelected.add(ticketId)
    setSelectedTickets(newSelected)
    setIsSelectingAllResults(false)
  }

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    // setCurrentPage(1) handled by effect
  }

  const clearFilters = () => {
    setFilters({ status: '', priority: '', category: '', assignedAgent: '' })
    setSearchInput('')
    setDebouncedSearch('')
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  // ---------- Client-side search remains (only on loaded page) ----------
  const visibleAndSearchedTickets = useMemo(() => {
    if (!debouncedSearch) return normalizedTickets
    const q = debouncedSearch.toLowerCase()
    return normalizedTickets.filter(t => {
      const byTicketId = (t.ticket_id ?? '').toLowerCase().includes(q)
      const bySubject = (t.subject ?? '').toLowerCase().includes(q)
      const byClient = (t.client?.name ?? '').toLowerCase().includes(q)
      return byTicketId || bySubject || byClient
    })
  }, [normalizedTickets, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil((ticketsData?.total ?? 0) / (ticketsData?.per_page ?? 10)))

  const pager = (() => {
    const maxButtons = 5
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    let end = Math.min(totalPages, start + maxButtons - 1)
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1)
    const arr: number[] = []
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  })()

  /* ---------- CSV helpers (identiques) ---------- */
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const ticketsToCsv = (items: Ticket[]) => {
    const header = ['Ticket ID', 'Subject', 'Status', 'Priority', 'Category', 'Assigned Agent', 'Client', 'Created At']
    const rows = items.map(t => ([
      t.ticket_id ?? t.id,
      (t.subject ?? '').replace(/\r?\n|\r/g, ' '),
      t.status ?? '',
      t.priority ?? '',
      t.category ?? '',
      t.assigned_agent?.name ?? '',
      t.client?.name ?? '',
      t.created_at ?? '',
    ]))
    return [header, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  }

  const exportSelected = async () => {
    if (selectedTickets.size === 0) {
      toast('No tickets selected to export')
      return
    }
    const selectedArr = normalizedTickets.filter(t => selectedTickets.has(t.id))
    downloadCSV(`tickets_selected_${new Date().toISOString()}.csv`, ticketsToCsv(selectedArr))
    toast.success('Exported selected tickets')
  }

  const exportVisible = () => {
    if ((visibleAndSearchedTickets ?? []).length === 0) {
      toast('No tickets to export on this page')
      return
    }
    downloadCSV(`tickets_page_${currentPage}_${new Date().toISOString()}.csv`, ticketsToCsv(visibleAndSearchedTickets))
    toast.success('Exported visible tickets (current page)')
  }

  const exportAllResults = async () => {
    try {
      const total = ticketsData?.total ?? 0
      const all = await fetchTickets({ per_page: total || 1000, page: 1, ...serverQueryParams })
      const rawAll = all.data ?? []
      const normalizedAll = rawAll.map((r: any) => normalizeTicket(r))
      downloadCSV(`tickets_all_${new Date().toISOString()}.csv`, ticketsToCsv(normalizedAll))
      toast.success('Exported all tickets')
    } catch (err: any) {
      toast.error('Failed to export all tickets: ' + (err?.message ?? ''))
    }
  }

  const bulkDeleteSelected = async () => {
    if (selectedTickets.size === 0) return toast('No tickets selected')
    if (!confirm(`Delete ${selectedTickets.size} ticket(s)? This cannot be undone.`)) return

    setIsPerformingBulk(true)
    const ids = Array.from(selectedTickets)
    const results = await Promise.allSettled(ids.map(id => deleteTicketApi(id)))
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.length - successCount
    if (successCount > 0) {
      toast.success(`Deleted ${successCount} ticket(s)`)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    }
    if (failCount > 0) toast.error(`${failCount} failed to delete`)
    setSelectedTickets(new Set())
    setIsSelectingAllResults(false)
    setIsPerformingBulk(false)
  }

  const selectAllAcrossResults = async () => {
    try {
      const total = ticketsData?.total ?? 0
      if (!total) return
      setIsSelectingAllResults(true)
      const all = await fetchTickets({ per_page: total || 1000, page: 1, ...serverQueryParams })
      const ids = (all.data ?? []).map((r: any) => normalizeTicket(r).id)
      setSelectedTickets(new Set(ids))
      toast.success(`Selected all ${ids.length} results`)
    } catch (err: any) {
      toast.error('Failed to select all results: ' + (err?.message ?? ''))
      setIsSelectingAllResults(false)
    }
  }

  // layout events
  useEffect(() => {
    const onExportEvent = () => {
      if (selectedTickets.size > 0) exportSelected()
      else exportVisible()
    }
    const onSearchEvent = (e: any) => {
      const term = e?.detail?.term ?? ''
      setSearchInput(term)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('globalTicketsExport', onExportEvent)
      window.addEventListener('globalTicketsSearch', onSearchEvent)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('globalTicketsExport', onExportEvent)
        window.removeEventListener('globalTicketsSearch', onSearchEvent)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTickets, visibleAndSearchedTickets, filters, currentPage, ticketsData, serverQueryParams])

  if (!isMounted) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600 mb-4">Error loading tickets: {(error as any)?.message}</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search tickets..."
                className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setDebouncedSearch(''); }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                  title="Clear search"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}>
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)}>
              <option value="">All Categories</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="feature-request">Feature Request</option>
              <option value="bug-report">Bug Report</option>
              <option value="other">Other</option>
            </select>

            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              More Filters
            </button>

            {(searchInput || filters.status || filters.priority || filters.category) && (
              <button onClick={clearFilters} className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800">
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-t bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-600 block mb-1">Assigned agent</label>
                <select value={filters.assignedAgent} onChange={(e) => handleFilterChange('assignedAgent', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Any agent</option>
                  {agents.map((a: UserShort) => <option key={a.id} value={String(a.id)}>{a.name}{a.department ? ` (${a.department})` : ''}</option>)}
                </select>
              </div>

              <div>
                <button onClick={() => { setShowFilters(false) }} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Done</button>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">All Tickets ({ticketsData?.total ?? 0})</p>
            {selectedTickets.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedTickets.size} selected</span>

                <button onClick={exportSelected} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50" disabled={isPerformingBulk}>Export selected</button>

                <button onClick={bulkDeleteSelected} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50" disabled={isPerformingBulk}>Delete selected</button>

                { (ticketsData?.total ?? 0) > selectedTickets.size && (
                  <button onClick={selectAllAcrossResults} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50" disabled={isSelectingAllResults}>{isSelectingAllResults ? 'Selecting...' : `Select all ${ticketsData?.total ?? 0} results`}</button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading tickets...</div>
        ) : (visibleAndSearchedTickets.length === 0) ? (
          <div className="p-8 text-center text-gray-500">
            <p>No tickets found</p>
            <button onClick={() => router.push('/admindashboard/tickets/new')} className="mt-2 text-blue-600 hover:text-blue-800">Create your first ticket</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input type="checkbox" checked={selectedTickets.size === visibleAndSearchedTickets.length && visibleAndSearchedTickets.length > 0} onChange={handleSelectAll} className="rounded border-gray-300" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Agent</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visibleAndSearchedTickets.map((ticket: Ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedTickets.has(ticket.id)} onChange={() => handleSelectTicket(ticket.id)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3">
                        {ticket.priority ? (
                          <div className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full", getPriorityColor(ticket.priority))}>
                            {getPriorityIcon(ticket.priority)}
                            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{displayOrDash(ticket.ticket_id)}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm text-gray-900 truncate" title={ticket.subject}>{displayOrDash(ticket.subject)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex px-2 py-1 text-xs font-semibold rounded-full border", getStatusColor(ticket.status))}>
                          {displayOrDash(ticket.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{displayOrDash(ticket.client?.name)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{ticket.category ? ticket.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {ticket.assigned_agent ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">{ticket.assigned_agent.name.charAt(0)}</span>
                            </div>
                            <span className="text-sm text-gray-900">{ticket.assigned_agent.name}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">—</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{formatDate(ticket.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => router.push(`/admindashboard/tickets/${ticket.id}`)} className="p-1 text-gray-400 hover:text-blue-600" title="Show ticket"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => router.push(`/admindashboard/tickets/${ticket.id}/edit`)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit ticket"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteMutation.mutate(ticket.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete ticket" disabled={deleteMutation.status === 'pending'}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * (ticketsData?.per_page ?? 10)) + 1} to {Math.min(currentPage * (ticketsData?.per_page ?? 10), ticketsData?.total ?? 0)} of {ticketsData?.total ?? 0} results
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Previous</button>
                    {pager.map((page) => (
                      <button key={page} onClick={() => setCurrentPage(page)} className={cn("px-3 py-1 text-sm rounded", page === currentPage ? "bg-blue-600 text-white" : "border border-gray-300 hover:bg-gray-50")}>{page}</button>
                    ))}
                    <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Next</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  ) 
}
