'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/context/Context'
import { ticketService } from '@/services/api'
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Clock, 
  User, 
  AlertTriangle,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { Ticket } from '@/types'

interface TicketWithExtensions extends Ticket {
  titre?: string
  priorite?: string
  statut?: string
  agentassigne_id?: number
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800', 
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-purple-100 text-purple-800'
}

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

export default function MyTicketsPage() {
  const router = useRouter()
  const { user } = useAppContext()
  const [tickets, setTickets] = useState<TicketWithExtensions[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    loadTickets()
  }, [user?.id])

  const loadTickets = async () => {
    try {
      setLoading(true)
      let response: any
      
      try {
        response = await ticketService.getAssigned()
      } catch (error) {
        console.warn('getAssigned failed, trying getAll with filter')
        const allResponse = await ticketService.getAll({ per_page: 1000 })
        const allTickets = allResponse?.data || allResponse || []
        
        // Ensure we have an array before filtering
        const ticketsArray = Array.isArray(allTickets) ? allTickets : []
        
        // Filter tickets assigned to current agent
        response = {
          data: ticketsArray.filter((ticket: any) => 
            ticket.agentassigne_id === user?.id
          )
        }
      }

      const ticketList = response?.data || response || []
      setTickets(Array.isArray(ticketList) ? ticketList : [])
    } catch (error) {
      console.error('Error loading tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const getStatus = (ticket: TicketWithExtensions) => {
    return ticket.status || ticket.statut || 'open'
  }

  const getPriority = (ticket: TicketWithExtensions) => {
    return ticket.priority || ticket.priorite || 'medium'
  }

  const getTitle = (ticket: TicketWithExtensions) => {
    return ticket.subject || ticket.titre || `Ticket #${ticket.id}`
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = getTitle(ticket).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || getStatus(ticket) === statusFilter
    const matchesPriority = priorityFilter === 'all' || getPriority(ticket) === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
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
      {/* Header */}
      <div className="flex items-center justify-end">
        

        <Link 
          href="/agentdashboard/my-tickets/new"
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </Link>
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
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
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
              <AlertTriangle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'You don\'t have any tickets assigned yet.'}
            </p>
            {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
              <Link 
                href="/agentdashboard/available-tickets"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              >
                View Available Tickets
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => {
                  const status = getStatus(ticket)
                  const priority = getPriority(ticket)
                  const title = getTitle(ticket)

                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{title}</div>
                          <div className="text-sm text-gray-500">#{ticket.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {ticket.client?.name || 'Unknown Client'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {ticket.client?.email || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'
                        }`}>
                          <AlertTriangle className="w-3 h-3" />
                          {priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {new Date(ticket.updated_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/agentdashboard/my-tickets/${ticket.id}`}
                          className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredTickets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredTickets.length} of {tickets.length} tickets
            </span>
            <div className="flex items-center gap-4">
              <span>
                Open: {filteredTickets.filter(t => ['open', 'in_progress'].includes(getStatus(t))).length}
              </span>
              <span>
                Resolved: {filteredTickets.filter(t => ['resolved', 'closed'].includes(getStatus(t))).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
