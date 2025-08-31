'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  LayoutDashboard,
  User,
  Ticket,
  Trash2,
  Users,
  MessageCircle,
  BarChart3,
  LogOut,
  Clock,
  CheckCircle,
  UserCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/context/Context'
import { useRouter } from 'next/navigation'

// --- Types
interface TicketStats {
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  active_customers: number
}

interface RecentTicket {
  id: string
  ticket_id: string
  customer: { name: string }
  subject: string
  status: 'open' | 'pending' | 'resolved' | 'closed' | string
  assigned_agent?: { name: string } | null
  priority: 'low' | 'medium' | 'high' | string
  created_at: string
}

interface DashboardData {
  stats: TicketStats
  recent_tickets: RecentTicket[]
}

// ------------------------
// Helper: auth headers
function getAuthHeaders(contentTypeJson = false): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token')
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  if (contentTypeJson) headers['Content-Type'] = 'application/json'

  return headers
}

// ------------------------
// fetchDashboard
export async function fetchDashboard(): Promise<DashboardData> {
  const headers = getAuthHeaders()
  const res = await fetch('/api/dashboard', {
    method: 'GET',
    headers,
    credentials: 'include',
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

  const stats: TicketStats = {
    total_tickets: json.stats?.total_tickets ?? 0,
    open_tickets: json.stats?.open_tickets ?? 0,
    resolved_tickets: json.stats?.resolved_tickets ?? 0,
    active_customers: json.stats?.active_customers ?? 0,
  }

  const recent_tickets: RecentTicket[] = (json.recent_tickets ?? []).map((t: any) => ({
    id: String(t.id),
    ticket_id: t.ticket_id ?? ('TK-' + String(t.id).padStart(3, '0')),
    customer: { name: t.customer?.name ?? 'Unknown' },
    subject: t.subject ?? t.titre ?? 'No subject',
    status: t.status ?? t.statut ?? 'open',
    assigned_agent: t.assigned_agent ? { name: t.assigned_agent.name } : (t.agent ? { name: t.agent.name } : undefined),
    priority: t.priority ?? t.priorite ?? 'low',
    created_at: t.created_at ?? new Date().toISOString(),
  }))

  return { stats, recent_tickets }
}

// ------------------------
// assignAgent
export async function assignAgent(ticketId: number | string, agentId: number | string) {
  const res = await fetch(`/api/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    credentials: 'include',
    body: JSON.stringify({ agent_id: Number(agentId) }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`assignAgent failed (${res.status}): ${text}`)
  }
  return res.json()
}

// ------------------------
// Component principal
export default function UHelpDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const queryClient = useQueryClient()
  const { user, logout } = useAppContext()
  const router = useRouter() // 🔥 hook Next.js pour redirection

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 1000 * 30,
    retry: 1,
    enabled: !!isMounted,
  })

  const assignMutation = useMutation({
    mutationFn: ({ ticketId, agentId }: { ticketId: number | string, agentId: number | string }) =>
      assignAgent(ticketId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  const handleLogout = () => {
    logout()
    router.push('/auth') // 🔥 redirection vers /auth après déconnexion
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB')
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white'
      case 'pending': return 'bg-yellow-500 text-white'
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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'global-tickets', label: 'Global Tickets', icon: Ticket },
    { id: 'trashed-tickets', label: 'Trashed Tickets', icon: Trash2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'live-chat', label: 'Live Chat', icon: MessageCircle },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'logout', label: 'Logout', icon: LogOut }
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-cyan-400 to-cyan-500 text-white">
        {/* Logo */}
        <div className="p-6 border-b border-cyan-300">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-cyan-500" />
            </div>
            <h1 className="text-xl font-bold">UHelp</h1>
          </div>
        </div>

        {/* Profile Section */}
        <div className="p-6 border-b border-cyan-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden">
              <img
                src={
                  isMounted && (user?.avatar || user?.profile_photo_url)
                    ? (user.avatar || user.profile_photo_url)
                    : "https://images.unsplash.com/photo-1494790108755-2616b75c7e90?w=150&h=150&fit=crop&crop=face"
                }
                alt={isMounted && user?.name ? user.name : "User avatar"}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-semibold">{isMounted && user?.name ? user.name : 'Utilisateur'}</p>
              <p className="text-cyan-100 text-sm">
                {isMounted && (user?.role || (user?.roles && user.roles[0]?.name))
                  ? (user.role ?? user.roles[0].name)
                  : 'Admin'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (item.id === 'logout') {
                        handleLogout() // 🔥 utilise la fonction de redirection
                      } else {
                        setActiveTab(item.id)
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                      activeTab === item.id
                        ? "bg-white bg-opacity-20 text-white font-medium"
                        : "text-cyan-100 hover:bg-white hover:bg-opacity-10"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Welcome back, {isMounted && user?.name ? user.name : 'Utilisateur'}!
              </h2>
              <p className="text-gray-600 mt-1">Here's what's happening with your helpdesk today.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tickets, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6 overflow-y-auto">
          {!isMounted ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading dashboard...</div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading dashboard...</div>
            </div>
          ) : isError ? (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-red-600">
                Erreur: {(error as any)?.message ?? 'Impossible de charger le dashboard.'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-3 px-4 py-2 bg-cyan-500 text-white rounded-lg"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Tickets */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-800">{data?.stats.total_tickets ?? 0}</p>
                      <p className="text-gray-600 text-sm">Total tickets</p>
                    </div>
                  </div>
                </div>

                {/* Open Tickets */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-800">{data?.stats.open_tickets ?? 0}</p>
                      <p className="text-gray-600 text-sm">Open tickets</p>
                    </div>
                  </div>
                </div>

                {/* Resolved Tickets */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-800">{data?.stats.resolved_tickets ?? 0}</p>
                      <p className="text-gray-600 text-sm">Resolved Tickets</p>
                    </div>
                  </div>
                </div>

                {/* Active Customers */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-800">{data?.stats.active_customers ?? 0}</p>
                      <p className="text-gray-600 text-sm">Active Customers</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Tickets */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Recent Tickets</h3>
                  <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm">
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data?.recent_tickets?.map((ticket) => (
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
                            {ticket.assigned_agent?.name || (
                              <select
                                className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-500"
                                onChange={(e) => {
                                  const agentId = e.target.value
                                  if (!agentId) return
                                  assignMutation.mutate({ ticketId: ticket.id, agentId })
                                }}
                              >
                                <option value="">Assign agent</option>
                                {/* TODO: remplir les agents dynamiquement */}
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={getPriorityColor(ticket.priority)}>
                              {String(ticket.priority).charAt(0).toUpperCase() + String(ticket.priority).slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(ticket.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
