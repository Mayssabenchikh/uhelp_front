'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageCircle,
  Eye,
  Mail
} from 'lucide-react'
import { useAppContext } from '@/context/Context'
import { ticketService } from '@/services/api'
import type { Ticket } from '@/types'

interface DashboardStats {
  openTickets: number
  resolvedToday: number
  totalResolved: number
  availableTickets: number
}

type AnyTicket = Ticket & {
  titre?: string
  priorite?: string
  statut?: string
  updated_at?: string
  [key: string]: any
}

interface PriorityTicket extends AnyTicket {
  urgentCount?: number
}

/* ------------------------- Helpers ------------------------- */
function extractList<T = any>(payload: any): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as T[]
  if (Array.isArray(payload.data)) return payload.data as T[]
  if (Array.isArray(payload.data?.data)) return payload.data.data as T[]
  if (Array.isArray(payload?.items)) return payload.items as T[]
  return []
}

function getStatus(ticket: AnyTicket): string {
  return (ticket.status ?? ticket.statut ?? '').toString()
}

function getUpdatedAt(ticket: AnyTicket): string {
  return (ticket.updatedAt ?? ticket.updated_at ?? '').toString()
}

function getPriority(ticket: AnyTicket): string | undefined {
  return (ticket.priority ?? ticket.priorite) as string | undefined
}

function getTicketTitle(t: AnyTicket) {
  return t.subject ?? t.titre ?? t.titre_fr ?? `TK-${t.id ?? ''}`
}

/* ------------------------- Component ------------------------- */
export default function AgentDashboard() {
  const router = useRouter()
  const { user } = useAppContext()
  const [stats, setStats] = useState<DashboardStats>({
    openTickets: 0,
    resolvedToday: 0,
    totalResolved: 0,
    availableTickets: 0
  })
  const [priorityTickets, setPriorityTickets] = useState<PriorityTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [user?.id])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadStats(), loadPriorityTickets()])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      let myPayload: any = null
      let availablePayload: any = null

      try {
        myPayload = await ticketService.getAssigned()
      } catch (e) {
        console.warn('ticketService.getAssigned failed, fallback to getAll', e)
      }

      try {
        availablePayload = await ticketService.getAvailable()
      } catch (e) {
        console.warn('ticketService.getAvailable failed, fallback to getAll', e)
      }

      if (!myPayload || !availablePayload) {
        const allPayload = await ticketService.getAll({ per_page: 1000 })
        const allTickets = extractList<AnyTicket>(allPayload)

        if (!myPayload) {
          const agentId = user?.id ?? null
          myPayload = agentId ? allTickets.filter(t => `${t.agentassigne_id}` === `${agentId}`) : []
        }

        if (!availablePayload) {
          availablePayload = allTickets.filter(t => {
            const s = getStatus(t)
            const assigned = t.agentassigne_id !== null && t.agentassigne_id !== undefined && `${t.agentassigne_id}` !== ''
            return (s === 'open' || s === 'pending') && !assigned
          })
        }
      }

      const tickets = extractList<AnyTicket>(myPayload)
      const availableList = extractList<AnyTicket>(availablePayload)

      const openTickets = tickets.filter((t) => {
        const s = getStatus(t)
        return s === 'open' || s === 'in_progress' || s === 'pending'
      }).length

      const today = new Date().toISOString().split('T')[0]
      const resolvedToday = tickets.filter((t) => {
        const s = getStatus(t)
        const updatedAt = getUpdatedAt(t)
        return (s === 'resolved' || s === 'closed' || s === 'solved') && typeof updatedAt === 'string' && updatedAt.startsWith(today)
      }).length

      const totalResolved = tickets.filter((t) => {
        const s = getStatus(t)
        return s === 'resolved' || s === 'closed' || s === 'solved'
      }).length

      setStats({
        openTickets,
        resolvedToday,
        totalResolved,
        availableTickets: availableList.length
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats({ openTickets: 0, resolvedToday: 0, totalResolved: 0, availableTickets: 0 })
    }
  }

  const loadPriorityTickets = async () => {
    try {
      let payload: any = null
      try {
        payload = await ticketService.getAssigned({ priority: 'high', status: 'open' })
      } catch (e) {
        console.warn('getAssigned(priority) failed, fallback to getAll', e)
        const allPayload = await ticketService.getAll({ per_page: 1000 })
        payload = allPayload
      }

      const list = extractList<AnyTicket>(payload)
      if (list.length === 0) {
        setPriorityTickets([])
        return
      }

      const highList = list.filter((t) => (getPriority(t) ?? '').toLowerCase() === 'high')
      const agentId = user?.id ?? null
      const agentHigh = agentId ? highList.filter((t) => `${t.agentassigne_id}` === `${agentId}`) : highList

      const urgentCount = highList.length
      const urgentTickets = agentHigh.slice(0, 3).map((ticket) => ({ ...ticket, urgentCount }))

      setPriorityTickets(urgentTickets)
    } catch (error) {
      console.error('Error loading priority tickets:', error)
      setPriorityTickets([])
    }
  }

  const handleTicket = (ticketId: string | number) => {
    router.push(`/agentdashboard/my-tickets/${ticketId}`)
  }

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
      <div className="flex justify-end items-center">
       

        <div className="flex gap-3">
          <Link 
            href="/agentdashboard/available-tickets"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Available Tickets
          </Link>
          <Link 
            href="/agentdashboard/my-tickets" 
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            My Tickets
          </Link>
          <Link 
            href="/agentdashboard/my-tickets/new" 
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            + New Ticket
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
          </div>
                              <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">{stats.totalResolved}</p>
            <p className="text-gray-600">Total resolved</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
                    <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">{stats.resolvedToday}</p>
            <p className="text-gray-600">Tickets resolved today</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">{stats.totalResolved}</p>
            <p className="text-gray-600">Total resolved</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">{stats.availableTickets}</p>
            <p className="text-gray-600">Available tickets</p>
          </div>
        </div>
      </div>

      {/* Priority Tickets - now full width */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Priority Tickets</h3>
          </div>
          <div>
            <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-sm font-medium">
              {priorityTickets.length} urgent
            </span>
          </div>
        </div>

        <div className="p-6">
          {priorityTickets.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No urgent tickets at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {priorityTickets.map((ticket) => (
                <div key={ticket.id ?? Math.random()} className="border-l-4 border-red-500 bg-gray-50 p-4 rounded-r-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">
                          {ticket.client?.name?.split?.(' ')?.map?.((n: string) => n[0]).join('') ?? ''}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{ticket.ticket_id ?? `TK-${ticket.id ?? ''}`}</p>
                        <p className="text-sm text-gray-600">{ticket.client?.name ?? '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">Urgent</span>
                    </div>
                  </div>

                  <p className="text-gray-900 font-medium mb-1">{getTicketTitle(ticket)}</p>
                  <p className="text-sm text-gray-600 mb-2">{ticket.description ?? '—'}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{ticket.client?.email ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-cyan-600" />
                      <span
                        className="cursor-pointer text-cyan-600"
                        style={{ textDecoration: 'none' }}
                        onClick={() => router.push(`/agentdashboard/my-tickets/${ticket.id}`)}
                      >
                        view
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}