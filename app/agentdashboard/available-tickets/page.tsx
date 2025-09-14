'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/context/Context'
import { ticketService } from '@/services/api'
import { 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  User, 
  AlertTriangle,
  ChevronDown,
  UserPlus
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

const categoryColors = {
  technical: 'bg-blue-100 text-blue-800',
  billing: 'bg-green-100 text-green-800',
  account: 'bg-purple-100 text-purple-800',
  general: 'bg-gray-100 text-gray-800'
}

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

export default function AvailableTicketsPage() {
  const router = useRouter()
  const { user } = useAppContext()
  const [tickets, setTickets] = useState<TicketWithExtensions[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [assigningTickets, setAssigningTickets] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      setLoading(true)
      
      // Try to get available tickets first
      let response: any
      try {
        response = await ticketService.getAvailable()
      } catch (error) {
        try {
          const allResponse = await ticketService.getAll({ per_page: 1000 })
          const allTickets = allResponse?.data || allResponse || []
          
          // Ensure we have an array before filtering
          const ticketsArray = Array.isArray(allTickets) ? allTickets : []
          
          // Filter tickets that are not assigned and have open/pending status
          response = {
            data: ticketsArray.filter((ticket: any) => 
              (!ticket.agentassigne_id || ticket.agentassigne_id === null) &&
              (ticket.statut === 'open' || ticket.status === 'open' || 
               ticket.statut === 'pending' || ticket.status === 'pending')
            )
          }
        } catch (fallbackError) {
          console.error('Error loading tickets:', fallbackError)
          response = { data: [] }
        }
      }

      const ticketList = response?.data || response || []
      const processedTickets = Array.isArray(ticketList) ? ticketList : []
      
      setTickets(processedTickets)
    } catch (error) {
      console.error('Error loading available tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const handleAssignToSelf = async (ticketId: string) => {
    if (!user?.id) {
      console.error('User not found or user ID missing')
      return
    }
    
    try {
      setAssigningTickets(prev => new Set(prev).add(ticketId))
      
      await ticketService.assignAgent(ticketId, user.id)
      
      // Remove ticket from available list
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId))
      
      // Navigate to the ticket
      router.push(`/agentdashboard/my-tickets/${ticketId}`)
    } catch (error) {
      console.error('Error assigning ticket:', error)
      // You might want to show a toast notification here
      alert('Failed to assign ticket. Please try again.')
    } finally {
      setAssigningTickets(prev => {
        const newSet = new Set(prev)
        newSet.delete(ticketId)
        return newSet
      })
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

  const getCategory = (ticket: TicketWithExtensions) => {
    return ticket.category || 'general'
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = getTitle(ticket).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id?.toString().includes(searchTerm)
    
    const matchesPriority = priorityFilter === 'all' || getPriority(ticket) === priorityFilter
    const matchesCategory = categoryFilter === 'all' || getCategory(ticket) === categoryFilter

    return matchesSearch && matchesPriority && matchesCategory
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

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Categories</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="account">Account</option>
              <option value="general">General</option>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No available tickets</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || priorityFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'All tickets are currently assigned.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => {
              const status = getStatus(ticket)
              const priority = getPriority(ticket)
              const category = getCategory(ticket)
              const title = getTitle(ticket)
              const isAssigning = assigningTickets.has(ticket.id)

              return (
                <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          T-{String(ticket.id).padStart(3, '0')}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </span>
                      </div>
                      
                      <h4 className="text-xl font-medium text-gray-900 mb-2">{title}</h4>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {ticket.description || 'No description provided'}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{ticket.client?.name || 'Unknown Client'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">|</span>
                          <span>{ticket.client?.email || ''}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-6">
                      <Link
                        href={`/agentdashboard/my-tickets/${ticket.id}`}
                        className="flex items-center gap-1 text-gray-600 hover:text-gray-700 text-sm font-medium px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                      <button
                        onClick={() => handleAssignToSelf(ticket.id)}
                        disabled={isAssigning}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px]"
                      >
                        {isAssigning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Assigning...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Take charge</span>
                          </>
                        )}
                      </button>
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
              Showing {filteredTickets.length} of {tickets.length} available tickets
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
                Billing: {filteredTickets.filter(t => getCategory(t) === 'billing').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
