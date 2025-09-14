'use client'

import { useState, useEffect } from 'react'
import { useAppContext } from '@/context/Context'
import { ticketService } from '@/services/api'
import { 
  Calendar,
  CheckCircle,
  Search,
  Eye,
  ChevronDown,
  Filter
} from 'lucide-react'
import Link from 'next/link'

interface TicketWithExtensions {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  client?: {
    id: number
    name: string
    email: string
  }
  titre?: string
  priorite?: string
  statut?: string
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800', 
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-red-500 text-white font-medium'
}

const categoryColors = {
  technical: 'bg-blue-500 text-white font-medium',
  billing: 'bg-green-500 text-white font-medium',
  account: 'bg-purple-500 text-white font-medium',
  general: 'bg-gray-500 text-white font-medium'
}

export default function ResolvedTicketsPage() {
  const { user } = useAppContext()
  const [tickets, setTickets] = useState<TicketWithExtensions[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [timeFilter, setTimeFilter] = useState('all')
  const [stats, setStats] = useState({
    resolvedToday: 0,
    totalResolved: 0
  })

  useEffect(() => {
    loadResolvedTickets()
  }, [])

  const loadResolvedTickets = async () => {
    try {
      setLoading(true)
      
      // Get assigned tickets and filter resolved ones
      const response = await ticketService.getAssigned()
      const allTickets = response?.data || response || []
      
      const resolvedTickets = Array.isArray(allTickets) 
        ? allTickets.filter((ticket: any) => 
            (ticket.status === 'resolved' || ticket.statut === 'resolved') &&
            ticket.agentassigne_id === user?.id
          )
        : []

      setTickets(resolvedTickets)
      
      // Calculate stats
      const today = new Date().toDateString()
      const resolvedToday = resolvedTickets.filter((ticket: any) => {
        const resolvedDate = ticket.resolved_at || ticket.updated_at
        return resolvedDate && new Date(resolvedDate).toDateString() === today
      }).length

      setStats({
        resolvedToday,
        totalResolved: resolvedTickets.length
      })
      
    } catch (error) {
      console.error('Error loading resolved tickets:', error)
      setTickets([])
      setStats({ resolvedToday: 0, totalResolved: 0 })
    } finally {
      setLoading(false)
    }
  }

  const getTitle = (ticket: TicketWithExtensions) => {
    return ticket.subject || ticket.titre || `Ticket #${ticket.id}`
  }

  const getPriority = (ticket: TicketWithExtensions) => {
    return ticket.priority || ticket.priorite || 'medium'
  }

  const getCategory = (ticket: TicketWithExtensions) => {
    return ticket.category || 'technical'
  }

  const getResolvedDate = (ticket: TicketWithExtensions) => {
    const date = ticket.resolved_at || ticket.updated_at
    if (!date) return 'Unknown date'
    
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = getTitle(ticket).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id?.toString().includes(searchTerm)

    if (timeFilter === 'all') return matchesSearch

    const resolvedDate = ticket.resolved_at || ticket.updated_at
    if (!resolvedDate) return false

    const ticketDate = new Date(resolvedDate)
    const now = new Date()

    switch (timeFilter) {
      case 'today':
        return matchesSearch && ticketDate.toDateString() === now.toDateString()
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return matchesSearch && ticketDate >= weekAgo
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return matchesSearch && ticketDate >= monthAgo
      default:
        return matchesSearch
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resolved Today */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.resolvedToday}</p>
              <p className="text-gray-600">Resolved today</p>
            </div>
          </div>
        </div>

        {/* Total Resolved */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalResolved}</p>
              <p className="text-gray-600">Total resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tickets by ID, subject, or client..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Time Filter */}
          <div className="relative">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resolved tickets</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || timeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'You haven\'t resolved any tickets yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => {
              const priority = getPriority(ticket)
              const category = getCategory(ticket)
              const title = getTitle(ticket)
              const resolvedDate = getResolvedDate(ticket)

              return (
                <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          T-{String(ticket.id).padStart(4, '0')}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </span>
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          categoryColors[category as keyof typeof categoryColors] || 'bg-gray-500 text-white'
                        }`}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </span>
                        <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-500 text-white">
                          Resolved
                        </span>
                      </div>
                      
                      <h4 className="text-xl font-medium text-gray-900 mb-2">{title}</h4>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Client:</span> {ticket.client?.name || 'Unknown Client'}
                        </div>
                        <div>
                          <span className="font-medium">Resolved</span> {resolvedDate}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <Link
                        href={`/agentdashboard/my-tickets/${ticket.id}`}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-700 text-sm font-medium px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View details
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredTickets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredTickets.length} of {tickets.length} resolved tickets
            </span>
            <div className="flex items-center gap-4">
              <span>
                Urgent: {filteredTickets.filter(t => getPriority(t) === 'urgent').length}
              </span>
              <span>
                High: {filteredTickets.filter(t => getPriority(t) === 'high').length}
              </span>
              <span>
                Technical: {filteredTickets.filter(t => getCategory(t) === 'technical').length}
              </span>
              <span>
                Account: {filteredTickets.filter(t => getCategory(t) === 'account').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
