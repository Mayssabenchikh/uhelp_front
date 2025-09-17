'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  UserCheck,
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

// --- Types
interface TicketStats {
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  total_customers: number
}

interface RecentTicket {
  id: string
  ticket_id: string
  customer: { id?: string | number; name: string }
  subject: string
  status: 'open' | 'pending' | 'resolved' | 'closed' | string
  assigned_agent?: { name: string } | null
  priority: 'low' | 'medium' | 'high' | string
  category?: string
  created_at: string
}

interface DashboardData {
  stats: TicketStats
  recent_tickets: RecentTicket[]
}

interface Agent {
  id: number
  name: string
  email?: string
  department?: string | null
}

// Helper: fetch headers already centralized in lib/utils.getAuthHeaders

// fetchDashboard
export async function fetchDashboard(): Promise<DashboardData> {
  const headers = getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/dashboard`, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    let text = await res.text()
    try {
      const json = JSON.parse(text)
      text = json.message ?? JSON.stringify(json)
    } catch {
      // ignore
    }
    throw new Error(`Dashboard fetch failed (${res.status}): ${text}`)
  }

  const json = await res.json()

  // Compute total_customers robustly:
  let totalCustomers = 0
  if (typeof json.stats?.total_customers === 'number') {
    totalCustomers = json.stats.total_customers
  } else if (typeof json.stats?.active_customers === 'number') {
    totalCustomers = json.stats.active_customers
  } else if (Array.isArray(json.customers)) {
    totalCustomers = json.customers.length
  } else {
    // Fall back: infer unique customers from available tickets arrays
    const customerSet = new Set<string>()
    const ticketSources = [
      ...(Array.isArray(json.recent_tickets) ? json.recent_tickets : []),
      ...(Array.isArray(json.tickets) ? json.tickets : []),
    ]
    ticketSources.forEach((t: any) => {
      if (t?.customer?.id !== undefined && t.customer.id !== null) {
        customerSet.add(String(t.customer.id))
      } else if (t?.client_id !== undefined && t.client_id !== null) {
        customerSet.add(String(t.client_id))
      } else if (t?.customer?.name) {
        // Use normalized name as last resort (lowercase trimmed)
        customerSet.add(String(t.customer.name).trim().toLowerCase())
      }
    })
    totalCustomers = customerSet.size
  }

  const stats: TicketStats = {
    total_tickets: json.stats?.total_tickets ?? json.total_tickets ?? 0,
    open_tickets: json.stats?.open_tickets ?? json.open_tickets ?? 0,
    resolved_tickets: json.stats?.resolved_tickets ?? json.resolved_tickets ?? 0,
    total_customers: totalCustomers,
  }

  const recent_tickets: RecentTicket[] = (json.recent_tickets ?? []).map((t: any) => ({
    id: String(t.id),
    ticket_id: t.ticket_id ?? ('TK-' + String(t.id).padStart(3, '0')),
    customer: {
      id: t.customer?.id ?? t.client_id ?? undefined,
      name: t.customer?.name ?? t.client_name ?? t('tickets.unknown')
    },
    subject: t.subject ?? t.titre ?? t('tickets.noSubject'),
    status: (t.status ?? t.statut ?? 'open') as any,
    assigned_agent: t.assigned_agent ? { name: t.assigned_agent.name } : (t.agent ? { name: t.agent.name } : undefined),
    priority: (t.priority ?? t.priorite ?? 'low') as any,
    category: t.category ?? t.categorie ?? (t.raw?.category ?? undefined),
    created_at: t.created_at ?? new Date().toISOString(),
  }))

  return { stats, recent_tickets }
}

// assignAgent
export async function assignAgent(ticketId: number | string, agentId: number | string) {
  const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ agent_id: Number(agentId) }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`assignAgent failed (${res.status}): ${text}`)
  }
  return res.json()
}

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Search (local client-side)
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 1000 * 30,
    retry: 1,
    enabled: !!isMounted,
  })

  // fetch agents for assign dropdown
  const { data: agentsData, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/agents`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Failed to fetch agents (${res.status}): ${txt}`)
      }
      const json = await res.json()
      return json.data ?? json
    },
    staleTime: 1000 * 60,
    enabled: !!isMounted,
  })

  const assignMutation = useMutation({
    mutationFn: ({ ticketId, agentId }: { ticketId: number | string, agentId: number | string }) =>
      assignAgent(ticketId, agentId),
    onMutate: async ({ ticketId, agentId }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] })
      const previous = queryClient.getQueryData<DashboardData>(['dashboard'])
      if (previous) {
        const next = {
          ...previous,
          recent_tickets: previous.recent_tickets.map(t => t.id === String(ticketId) ? { ...t, assigned_agent: { name: agentsData?.find(a => String(a.id) === String(agentId))?.name ?? '...' } } : t)
        }
        queryClient.setQueryData(['dashboard'], next)
      }
      return { previous }
    },
    onError: (err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['dashboard'], context.previous)
      toast.error(t('messages.error.assignFailed') + ': ' + ((err as any)?.message ?? t('messages.error.unknownError')))
    },
    onSuccess: () => {
      toast.success(t('messages.success.agentAssigned'))
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  const formatDate = (dateString: string) => {
    try {
      const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-GB'
      return new Date(dateString).toLocaleDateString(locale)
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white'
      case 'in_progress': return 'bg-yellow-500 text-white'
      case 'resolved': return 'bg-green-500 text-white'
      case 'closed': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 font-semibold'
      case 'medium': return 'text-yellow-600 font-semibold'
      case 'low': return 'text-green-600 font-semibold'
      default: return 'text-gray-600'
    }
  }

  // Filter tickets to only those created within the last 30 days
  const ticketsLast30Days = useMemo(() => {
    const now = Date.now()
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
    return (data?.recent_tickets ?? []).filter(t => {
      if (!t?.created_at) return false
      const parsed = Date.parse(t.created_at)
      if (isNaN(parsed)) return false
      return (now - parsed) <= THIRTY_DAYS_MS
    })
  }, [data])

  // client-side filtering for search applied on ticketsLast30Days
  const filteredTickets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return ticketsLast30Days
    return ticketsLast30Days.filter(t => {
      return (
        String(t.ticket_id).toLowerCase().includes(q) ||
        (t.customer?.name ?? '').toLowerCase().includes(q) ||
        (t.subject ?? '').toLowerCase().includes(q)
      )
    })
  }, [ticketsLast30Days, searchTerm])

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('messages.loading.dashboard')}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('messages.loading.dashboard')}</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-600">
          Erreur: {(error as any)?.message ?? 'Impossible de charger le dashboard.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Total Tickets */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TicketIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xl md:text-2xl font-bold text-gray-800 truncate">{data?.stats.total_tickets ?? 0}</p>
              <p className="text-gray-600 text-xs md:text-sm truncate">{t('dashboard.totalTickets')}</p>
            </div>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xl md:text-2xl font-bold text-gray-800 truncate">{data?.stats.open_tickets ?? 0}</p>
              <p className="text-gray-600 text-xs md:text-sm truncate">{t('dashboard.openTickets')}</p>
            </div>
          </div>
        </div>

        {/* Resolved Tickets */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xl md:text-2xl font-bold text-gray-800 truncate">{data?.stats.resolved_tickets ?? 0}</p>
              <p className="text-gray-600 text-xs md:text-sm truncate">{t('dashboard.resolvedTickets')}</p>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-shadow xs:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xl md:text-2xl font-bold text-gray-800 truncate">{data?.stats.total_customers ?? 0}</p>
              <p className="text-gray-600 text-xs md:text-sm truncate">{t('dashboard.totalCustomers')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets - Responsive Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-800 truncate">{t('dashboard.recentTickets')}</h3>
              <p className="text-sm text-gray-500 truncate">
                {t('dashboard.latestTickets')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input (local) - Responsive */}
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 sm:flex-none sm:w-48"
              />

              <button
                onClick={() => router.push('/superadmindashboard/globaltickets')}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm whitespace-nowrap"
              >
                {t('dashboard.viewAll')}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tickets.ticketId')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tickets.customer')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tickets.subject')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tickets.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tickets.assignedAgent')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tickets.priority')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tickets.category')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tickets.date')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.ticket_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.customer.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{ticket.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("inline-flex px-2 py-1 text-xs font-semibold rounded-full", getStatusColor(ticket.status))}>
                      {String(ticket.status).charAt(0).toUpperCase() + String(ticket.status).slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ticket.assigned_agent?.name ? (
                      <span>{ticket.assigned_agent.name}</span>
                    ) : (
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-500"
                        onChange={(e) => {
                          const agentId = e.target.value
                          if (!agentId) return
                          assignMutation.mutate({ ticketId: ticket.id, agentId })
                        }}
                        disabled={assignMutation.status === 'pending'}
                      >
                        <option value="">Assign agent</option>
                        {agentsLoading && <option>{t('messages.loading')}</option>}
                        {agentsData?.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} {a.department ? `(${a.department})` : ''}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getPriorityColor(ticket.priority)}>
                      {String(ticket.priority).charAt(0).toUpperCase() + String(ticket.priority).slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {ticket.category ? ticket.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(ticket.created_at)}</td>
                </tr>
              ))}

              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    {t('dashboard.noTicketsFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-gray-200">
          {filteredTickets.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {t('dashboard.noTicketsFound')}
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col space-y-3">
                  {/* Header: ID + Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">#{ticket.ticket_id}</span>
                    <span className={cn("inline-flex px-2 py-1 text-xs font-semibold rounded-full", getStatusColor(ticket.status))}>
                      {String(ticket.status).charAt(0).toUpperCase() + String(ticket.status).slice(1)}
                    </span>
                  </div>
                  
                  {/* Subject */}
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{t('tickets.subject')}:</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{ticket.subject}</p>
                  </div>
                  
                  {/* Customer + Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('tickets.customer')}</p>
                      <p className="text-sm text-gray-900 truncate">{ticket.customer.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('tickets.priority')}</p>
                      <span className={cn("text-sm", getPriorityColor(ticket.priority))}>
                        {String(ticket.priority).charAt(0).toUpperCase() + String(ticket.priority).slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Agent Assignment */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('tickets.assignedAgent')}</p>
                    {ticket.assigned_agent?.name ? (
                      <p className="text-sm text-gray-900">{ticket.assigned_agent.name}</p>
                    ) : (
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-500 w-full"
                        onChange={(e) => {
                          const agentId = e.target.value
                          if (!agentId) return
                          assignMutation.mutate({ ticketId: ticket.id, agentId })
                        }}
                        disabled={assignMutation.status === 'pending'}
                      >
                        <option value="">{t('actions.assignAgent')}</option>
                        {agentsLoading && <option>{t('messages.loading')}</option>}
                        {agentsData?.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} {a.department ? `(${a.department})` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* Category + Date */}
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">{t('tickets.category')}:</span> {ticket.category ? ticket.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}
                    </div>
                    <div>
                      <span className="font-medium">{t('tickets.date')}:</span> {formatDate(ticket.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
