'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ticketService } from '@/services/api'
import { Ticket } from '@/types'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export default function TicketsPage() {
  const { t } = useTranslation()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'priority' | 'status'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketService.getUserTickets()
  })

  useEffect(() => {
    if (data) {
      const raw = (data as any).data
      const items = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
      const mapped: Ticket[] = items.map((t: any) => ({
        id: String(t.id),
        ticket_id: t.ticket_id || `TK-${t.id}`,
        subject: t.subject || t.titre,
        description: t.description,
        status: t.status || t.statut,
        priority: t.priority || t.priorite || 'low',
        category: t.category ?? undefined,
        created_at: t.created_at,
        updated_at: t.updated_at,
        client: t.customer || t.client || { id: t.raw?.client_id, name: '' },
        assigned_agent: t.assigned_agent || null,
        responses: [],
      }))
      setTickets(mapped)
      setLoading(false)
    }
    if (isError) {
      setError(queryError instanceof Error ? queryError.message : 'Error fetching tickets')
      setLoading(false)
    }
  }, [data, isError, queryError])

  const getStatusConfig = (status: string) => {
    const configs = {
      open: { 
        bg: 'bg-blue-50 border-blue-200', 
        text: 'text-blue-700', 
        badge: 'bg-blue-100 text-blue-800',
        icon: '🔵'
      },
      pending: { 
        bg: 'bg-amber-50 border-amber-200', 
        text: 'text-amber-700', 
        badge: 'bg-amber-100 text-amber-800',
        icon: '⏳'
      },
      closed: { 
        bg: 'bg-green-50 border-green-200', 
        text: 'text-green-700', 
        badge: 'bg-green-100 text-green-800',
        icon: '✅'
      },
      resolved: { 
        bg: 'bg-green-50 border-green-200', 
        text: 'text-green-700', 
        badge: 'bg-green-100 text-green-800',
        icon: '✅'
      },
      default: { 
        bg: 'bg-gray-50 border-gray-200', 
        text: 'text-gray-700', 
        badge: 'bg-gray-100 text-gray-800',
        icon: '⚪'
      }
    }
    return configs[status as keyof typeof configs] || configs.default
  }

  const getPriorityConfig = (priority: string) => {
    const configs = {
      high: { 
        badge: 'bg-red-100 text-red-800 border-red-200', 
        icon: '🔴',
        ring: 'ring-2 ring-red-100'
      },
      medium: { 
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: '🟡',
        ring: 'ring-1 ring-yellow-100'
      },
      low: { 
        badge: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: '⚪',
        ring: ''
      },
      default: { 
        badge: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: '⚪',
        ring: ''
      }
    }
    return configs[priority as keyof typeof configs] || configs.default
  }

  const filtered = useMemo(() => {
    let result = tickets.filter(ticket => {
      const matchesSearch = search === '' || 
        ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
        ticket.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
        (ticket.description && ticket.description.toLowerCase().includes(search.toLowerCase()))
      
      const matchesStatus = status === '' || ticket.status === status
      const matchesPriority = priority === '' || ticket.priority === priority
      
      return matchesSearch && matchesStatus && matchesPriority
    })

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                     (priorityOrder[b.priority as keyof typeof priorityOrder] || 0)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'created_at':
        case 'updated_at':
          comparison = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [tickets, search, status, priority, sortBy, sortOrder])

  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length
    const pending = tickets.filter(t => t.status === 'pending').length
    const closed = tickets.filter(t => ['closed', 'resolved'].includes(t.status)).length
    const high = tickets.filter(t => t.priority === 'high').length
    
    return { open, pending, closed, high, total: tickets.length }
  }, [tickets])

  const formatDate = (date: string) => {
    const now = new Date()
    const ticketDate = new Date(date)
    const diffTime = Math.abs(now.getTime() - ticketDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    
    return ticketDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: ticketDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setPriority('')
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('tickets.loading') || 'Loading tickets...'}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-red-600 text-xl mb-2">⚠️ Error</div>
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('tickets.myTickets') || 'My Tickets'}</h1>
            <p className="text-gray-600 mt-1">{t('tickets.subtitle') || 'Manage and track your support requests'}</p>
          </div>
          <Link 
            href="/clientdashboard/tickets/new"
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm hover:shadow-md"
          >
            {t('tickets.newTicket') || '+ New Ticket'}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">{t('tickets.total') || 'Total'}</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            <div className="text-sm text-gray-600">{t('tickets.open') || 'Open'}</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">{t('tickets.pending') || 'Pending'}</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
            <div className="text-sm text-gray-600">{t('tickets.closed') || 'Closed'}</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <div className="text-sm text-gray-600">{t('tickets.highPriority') || 'High Priority'}</div>
          </div>
        </div>
      </div>

      {/* Filters and controls */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('tickets.searchPlaceholder') || 'Search by title, ID or description...'}
                className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
            >
              <option value="">{t('tickets.allStatuses') || 'All statuses'}</option>
              <option value="open">🔵 Open</option>
              <option value="pending">⏳ Pending</option>
              <option value="resolved">✅ Resolved</option>
              <option value="closed">✅ Closed</option>
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
            >
              <option value="">{t('tickets.allPriorities') || 'All priorities'}</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">⚪ Low</option>
            </select>

            {(search || status || priority) && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
              >
                {t('actions.clear') || 'Clear'}
              </button>
            )}
          </div>

          {/* Display controls */}
          <div className="flex items-center gap-4">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as typeof sortBy)
                setSortOrder(order as typeof sortOrder)
              }}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-sm"
            >
              <option value="created_at-desc">{t('tickets.sort.newest') || 'Newest first'}</option>
              <option value="created_at-asc">{t('tickets.sort.oldest') || 'Oldest first'}</option>
              <option value="updated_at-desc">{t('tickets.sort.recentlyUpdated') || 'Recently updated'}</option>
              <option value="priority-desc">{t('tickets.sort.highPriority') || 'High priority first'}</option>
              <option value="status-asc">{t('tickets.sort.status') || 'Status'}</option>
            </select>

            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-cyan-50 text-cyan-700 border-r border-cyan-200' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-r border-gray-200'
                }`}
              >
                {t('actions.list') || 'List'}
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-cyan-50 text-cyan-700' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {t('actions.grid') || 'Grid'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tickets list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('tickets.tickets') || 'Tickets'} ({filtered.length})
            </h3>
            {filtered.length !== tickets.length && (
              <span className="text-sm text-gray-500">
                {filtered.length} of {tickets.length} ticket{tickets.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tickets.length === 0 ? (t('tickets.noTickets') || 'No tickets') : (t('tickets.noResults') || 'No results')}
            </h3>
            <p className="text-gray-600 mb-6">
              {tickets.length === 0 
                ? (t('tickets.noTicketsDesc') || "You haven't created any support tickets yet.")
                : (t('tickets.noResultsDesc') || 'No tickets match your search criteria.')
              }
            </p>
            {tickets.length === 0 ? (
              <Link 
                href="/clientdashboard/tickets/new"
                className="inline-flex items-center px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors"
              >
                {t('tickets.createFirst') || 'Create my first ticket'}
              </Link>
            ) : (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
              >
                {t('actions.clearFilters') || 'Clear filters'}
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6'
            : 'divide-y divide-gray-100'
          }>
            {filtered.map((ticket) => {
              const statusConfig = getStatusConfig(ticket.status)
              const priorityConfig = getPriorityConfig(ticket.priority)
              
              return viewMode === 'grid' ? (
                <Link 
                  key={ticket.id} 
                  href={`/clientdashboard/tickets/${ticket.id}`}
                  className={`block bg-white border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-200 ${statusConfig.bg} ${priorityConfig.ring}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {ticket.ticket_id}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border ${statusConfig.badge}`}>
                        {statusConfig.icon} {ticket.status}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${priorityConfig.badge}`}>
                      {priorityConfig.icon}
                    </span>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-3 line-clamp-2">
                    {ticket.subject}
                  </h4>
                  
                  {ticket.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {ticket.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Created {formatDate(ticket.created_at)}</span>
                    {ticket.category && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {ticket.category}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <Link 
                  key={ticket.id} 
                  href={`/clientdashboard/tickets/${ticket.id}`}
                  className={`block hover:bg-gray-50 transition-colors p-6 ${priorityConfig.ring ? 'border-l-4 border-l-red-300' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-md">
                        {ticket.ticket_id}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusConfig.badge}`}>
                        {statusConfig.icon} {ticket.status}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${priorityConfig.badge}`}>
                        {priorityConfig.icon} {ticket.priority}
                      </span>
                      {ticket.category && (
                        <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                          {ticket.category}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(ticket.created_at)}
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-2 text-lg">
                    {ticket.subject}
                  </h4>
                  
                  {ticket.description && (
                    <p className="text-gray-600 line-clamp-2">
                      {ticket.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Updated {formatDate(ticket.updated_at)}</span>
                      {ticket.assigned_agent && (
                        <span>Assigned to {ticket.assigned_agent.name}</span>
                      )}
                    </div>
                    <span className="text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                      View details →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}