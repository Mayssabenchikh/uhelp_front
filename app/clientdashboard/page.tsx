'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { 
  AlertTriangle, 
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { useAppContext } from '@/context/Context'
import { ticketService, userService } from '@/services/api'

interface RecentTicket {
  id: string
  title: string
  status: 'open' | 'pending' | 'closed' | string
  priority: 'high' | 'medium' | 'low' | string
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
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [alerts] = useState<Alert[]>([])
  const { user } = useAppContext()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await ticketService.getUserTickets({ per_page: 200 })
        const raw = (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && 'data' in res.data)
          ? (res.data as { data: any[] }).data
          : (Array.isArray(res.data) ? res.data : res.data ?? []);
        const items = Array.isArray(raw) ? raw : []
        const mapped = items.map((t: any) => ({
          id: t.ticket_id || `TK-${t.id}`,
          title: t.subject || t.titre || t('tickets.noSubject'),
          status: t.status || t.statut || 'open',
          priority: t.priority || t.priorite || 'low',
          created_at: t.created_at,
        }))
        setRecentTickets(mapped)

        // compute counts
        const total = items.length
        const open = items.filter((t: any) => (t.status ?? t.statut) === 'open').length
        const pending = items.filter((t: any) => (t.status ?? t.statut) === 'pending' || (t.status ?? t.statut) === 'in_progress').length
        const resolved = items.filter((t: any) => (t.status ?? t.statut) === 'resolved' || (t.status ?? t.statut) === 'closed').length
        const closed = items.filter((t: any) => (t.status ?? t.statut) === 'closed').length
        setCounts({ total, open, pending, resolved, closed })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching tickets:', error)
      }
    }

    fetchTickets()
  }, [])

  const [counts, setCounts] = useState<{ total: number; open: number; pending: number; resolved: number; closed: number }>({ total: 0, open: 0, pending: 0, resolved: 0, closed: 0 })
  useEffect(() => {
    const loadCounts = async () => {
      try {
        if (!user?.id) return
        const res = await userService.getTicketCounts([user.id])
        const arr = res.data?.data ?? []
        const row = Array.isArray(arr) ? arr.find((r: any) => String(r.user_id) === String(user.id)) : null
        if (row) {
          const total = (row.client_created ?? 0)
          const resolved = (row.client_resolved ?? 0)
          setCounts((prev) => ({ total, open: prev.open, pending: prev.pending, resolved, closed: resolved }))
        }
      } catch (e) {
        // ignore
      }
    }
    loadCounts()
  }, [user?.id])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-gradient-to-r from-cyan-100 to-cyan-200 text-cyan-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-cyan-200'
      case 'pending':
        return 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-amber-200'
      case 'closed':
      case 'resolved':
        return 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-emerald-200'
      default:
        return 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-slate-200'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-red-200'
      case 'medium':
        return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-orange-200'
      case 'low':
        return 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-slate-200'
      default:
        return 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-slate-200'
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-4 md:p-6">
      <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto">
        {/* User ticket stats - Enhanced responsive grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 md:p-6 border border-cyan-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-cyan-50">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs md:text-sm font-medium text-cyan-600 uppercase tracking-wide">{t('client.totalTickets')}</div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 md:w-5 md:h-5 bg-white rounded-sm"></div>
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">{counts.total}</div>
            <div className="mt-2 h-1 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"></div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 md:p-6 border border-cyan-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs md:text-sm font-medium text-blue-600 uppercase tracking-wide">{t('client.open')}</div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">{counts.open}</div>
            <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 md:p-6 border border-cyan-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-amber-50">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs md:text-sm font-medium text-amber-600 uppercase tracking-wide">{t('client.pending')}</div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 md:w-3 md:h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-amber-600">{counts.pending}</div>
            <div className="mt-2 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"></div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 md:p-6 border border-cyan-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-emerald-50 xs:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs md:text-sm font-medium text-emerald-600 uppercase tracking-wide">{t('client.resolvedClosed')}</div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-emerald-600">{counts.resolved + counts.closed}</div>
            <div className="mt-2 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          {/* Recent Tickets - Enhanced responsive */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-cyan-100 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-teal-500 p-4 md:p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-3">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-sm"></div>
                  </div>
                  {t('client.recentTickets')}
                </h3>
                <Link 
                  href="/clientdashboard/tickets"
                  className="text-white/90 hover:text-white font-medium flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-3 md:px-4 py-2 rounded-xl transition-all duration-200 text-sm whitespace-nowrap"
                >
                  {t('client.viewAll')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="p-4 md:p-6 bg-gradient-to-b from-cyan-50/50 to-white">
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white border border-cyan-100 rounded-xl p-4 md:p-5 hover:border-cyan-300 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs md:text-sm font-semibold text-cyan-700 bg-cyan-100 px-2 md:px-3 py-1 rounded-lg border border-cyan-200">{ticket.id}</span>
                        <span className={getStatusBadge(ticket.status)}>
                          {t(`tickets.${ticket.status}`)}
                        </span>
                        <div className={getPriorityBadge(ticket.priority)}>
                          {t(`tickets.${ticket.priority}`)}
                        </div>
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-base md:text-lg leading-tight line-clamp-2">{ticket.title}</h4>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0"></div>
                      <p className="truncate">{ticket.created_at}</p>
                    </div>
                  </div>
                ))}
                {recentTickets.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-cyan-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg opacity-30"></div>
                    </div>
                    <p className="text-gray-500 font-medium">{t('tickets.noRecent')}</p>
                    <p className="text-gray-400 text-sm mt-1">{t('tickets.noRecentDesc')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions - Enhanced responsive */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-cyan-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-4 md:p-6 text-white">
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-3">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                Quick Actions
              </h3>
            </div>
            <div className="p-4 md:p-6 bg-gradient-to-b from-teal-50/50 to-white">
              <div className="space-y-4">
                <Link href="/clientdashboard/create-ticket" className="block w-full">
                  <div className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white p-3 md:p-4 rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm md:text-base">{t('client.createTicket')}</span>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                    </div>
                  </div>
                </Link>
                
                <Link href="/clientdashboard/tickets" className="block w-full">
                  <div className="bg-white border-2 border-cyan-200 p-3 md:p-4 rounded-xl hover:border-cyan-300 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-700 text-sm md:text-base">{t('client.viewAllTickets')}</span>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-cyan-600 flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}