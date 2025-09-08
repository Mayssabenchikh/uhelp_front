'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { useAppContext } from '@/context/Context'

interface TicketStats {
  total: number
  open: number
  pending: number
  resolved: number
}

interface RecentTicket {
  id: string
  title: string
  status: 'open' | 'pending' | 'closed'
  priority: 'high' | 'medium' | 'low'
  created_at: string
}

interface Alert {
  id: string
  type: 'warning' | 'info' | 'success'
  title: string
  message: string
  action?: {
    text: string
    url: string
  }
}

export default function ClientDashboardPage() {
  const [stats, setStats] = useState<TicketStats>({
    total: 15,
    open: 3,
    pending: 2,
    resolved: 10
  })

  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([
    {
      id: 'T015',
      title: 'Application login issue',
      status: 'open',
      priority: 'high',
      created_at: 'Jan 15, 11:30 AM'
    },
    {
      id: 'T016',
      title: 'Billing question',
      status: 'pending',
      priority: 'medium',
      created_at: 'Jan 14, 03:20 PM'
    },
    {
      id: 'T017',
      title: 'Feature request',
      status: 'closed',
      priority: 'low',
      created_at: 'Jan 13, 10:15 AM'
    }
  ])

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'warning',
      title: 'Pending Invoice',
      message: 'Your invoice #INV-2024-001 has been pending payment for 5 days.',
      action: {
        text: 'Pay now',
        url: '/clientdashboard/billing'
      }
    },
    {
      id: '2',
      type: 'info',
      title: 'New Feature',
      message: 'Discover our new real-time chat system!',
      action: {
        text: 'Try it now',
        url: '/clientdashboard/live-chat'
      }
    }
  ])

  const { user } = useAppContext()

  // Simulated data loading - replace with actual API calls
  useEffect(() => {
    // Fetch dashboard data from Laravel API
    const fetchDashboardData = async () => {
      try {
        // Example API calls
        // const statsResponse = await fetch('/api/dashboard/stats')
        // const ticketsResponse = await fetch('/api/dashboard/recent-tickets')
        // const alertsResponse = await fetch('/api/dashboard/alerts')
        // setStats(await statsResponse.json())
        // setRecentTickets(await ticketsResponse.json())
        // setAlerts(await alertsResponse.json())
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }

    // fetchDashboardData()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium'
      case 'pending':
        return 'bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium'
      case 'closed':
        return 'bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium'
      default:
        return 'bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium'
      case 'low':
        return 'bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium'
      default:
        return 'bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tickets */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total tickets</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Open</p>
              <p className="text-3xl font-bold text-blue-600">{stats.open}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Resolved Tickets */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">resolved</p>
              <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tickets */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
              <Link 
                href="/clientdashboard/tickets"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">{ticket.id}</span>
                      <span className={getStatusBadge(ticket.status)}>
                        {ticket.status}
                      </span>
                      <span className={getPriorityBadge(ticket.priority)}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{ticket.title}</h4>
                  <p className="text-sm text-gray-500">{ticket.created_at}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Important Alerts */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Important alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
                      {alert.action && (
                        <Link
                          href={alert.action.url}
                          className="inline-block text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {alert.action.text}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}