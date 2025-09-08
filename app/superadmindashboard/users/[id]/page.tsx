'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Edit,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  ExternalLink
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import { format } from 'date-fns'

interface User {
  id: number
  name: string
  email: string
  role: 'agent' | 'client' | string
  phone_number?: string
  location?: string
  profile_photo?: string
  profile_photo_url?: string
  department_id?: number | null
  department?: {
    id: number
    name: string
    description?: string
  } | null
  created_at: string
  updated_at: string
  email_verified_at?: string | null
  last_login_at?: string | null
  tickets_count?: number
  active_tickets_count?: number
  resolved_tickets_count?: number
}

// --- API helpers ---

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch user: ${text}`)
  }
  const json = await res.json()
  return json.data ?? json
}

async function fetchTicketCountForUser(userId: string, role: string, status?: string): Promise<number> {
  // Only compute counts for agents/clients. For other roles fallback to 0.
  if (!userId) return 0
  const params = new URLSearchParams()
  params.set('per_page', '1') // we only need pagination meta.total

  if (role === 'agent') {
    params.set('assigned_agent', String(userId))
  } else if (role === 'client') {
    params.set('client_id', String(userId))
  } else {
    // If role unknown, attempt client_id first then assigned_agent as fallback is risky.
    return 0
  }

  if (status) params.set('status', status)

  const url = `${API_BASE}/api/tickets?${params.toString()}`
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch tickets: ${text}`)
  }

  const json = await res.json()

  // Laravel paginator returns "total" at top-level; other APIs may use meta.total
  if (typeof json.total === 'number') return json.total
  if (json.meta && typeof json.meta.total === 'number') return json.meta.total
  // Fallback: if an array returned, use length
  if (Array.isArray(json)) return json.length

  // Last resort: try data.length
  if (json.data && Array.isArray(json.data)) return json.data.length

  return 0
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string

  const [isMounted, setIsMounted] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const { data: user, isLoading, error, refetch } = useQuery<User, Error>({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: isMounted && !!userId
  })

  // Ticket counts (total and resolved). Active = total - resolved.
  const totalTicketsQuery = useQuery<number, Error>({
    queryKey: ['user', userId, 'tickets', 'total'],
    queryFn: () => fetchTicketCountForUser(userId, user!.role, undefined),
    enabled: !!user
  })

  const resolvedTicketsQuery = useQuery<number, Error>({
    queryKey: ['user', userId, 'tickets', 'resolved'],
    queryFn: () => fetchTicketCountForUser(userId, user!.role, 'closed'),
    enabled: !!user
  })

  const totalTickets = Number(totalTicketsQuery.data ?? 0)
  const resolvedTickets = Number(resolvedTicketsQuery.data ?? 0)
  const activeTickets = Math.max(0, totalTickets - resolvedTickets)

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'agent': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'client': return 'text-green-700 bg-green-100 border-green-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'agent': return <Shield className="w-4 h-4" />
      case 'client': return <UserIcon className="w-4 h-4" />
      default: return <UserIcon className="w-4 h-4" />
    }
  }

  const getStatusBadge = (user: User) => {
    const isActive = !!user.email_verified_at
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
        isActive 
          ? "bg-green-100 text-green-800 border border-green-200" 
          : "bg-yellow-100 text-yellow-800 border border-yellow-200"
      )}>
        {isActive ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {isActive ? 'Active' : 'Pending Verification'}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP')
    } catch {
      return 'Invalid date'
    }
  }

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Never'
    try {
      return format(new Date(dateString), 'PPP p')
    } catch {
      return 'Invalid date'
    }
  }

  if (!isMounted) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Error Loading User</h2>
          </div>
          <p className="text-red-700 mt-2">{error.message}</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/superadmindashboard/users')}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Back to Users
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-64 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-20 h-10 bg-gray-200 rounded"></div>
              <div className="w-24 h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-lg border">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border">
                <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-4 w-24 bg-gray-200 rounded mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-4">The user you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => router.push('/superadmindashboard/users')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Users
          </button>
        </div>
      </div>
    )
  }

  // Show the page
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              {getStatusBadge(user)}
            </div>
            
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg border", getRoleColor(user.role))}>
                {getRoleIcon(user.role)}
                <span className="text-sm font-medium capitalize">{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/superadmindashboard/users/${userId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">User Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Full Name</dt>
                  <dd className="text-base text-gray-900">{user.name}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Email Address</dt>
                  <dd className="text-base text-gray-900">{user.email}</dd>
                </div>
                
                {user.phone_number && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Phone Number</dt>
                    <dd className="flex items-center gap-2 text-base text-gray-900">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {user.phone_number}
                    </dd>
                  </div>
                )}
                
                {user.location && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Location</dt>
                    <dd className="flex items-center gap-2 text-base text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {user.location}
                    </dd>
                  </div>
                )}
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">User Role</dt>
                  <dd className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-medium", getRoleColor(user.role))}>
                    {getRoleIcon(user.role)}
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Account Status</dt>
                  <dd>{getStatusBadge(user)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Department Information (for agents) */}
          {user.role === 'agent' && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <h2 className="text-xl font-semibold text-gray-900">Department</h2>
                </div>
              </div>
              <div className="p-6">
                {user.department ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{user.department.name}</h3>
                      <button
                        onClick={() => router.push(`/superadmindashboard/departments/${user.department?.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                    {user.department.description && (
                      <p className="text-gray-600">{user.department.description}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No department assigned</p>
                    <button
                      onClick={() => router.push(`/superadmindashboard/users/${userId}/edit`)}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Assign Department
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Timeline */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900">Account Timeline</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Account Created</p>
                    <p className="text-sm text-gray-500">{formatDate(user.created_at)}</p>
                  </div>
                </div>
                
                {user.email_verified_at && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Email Verified</p>
                      <p className="text-sm text-gray-500">{formatDate(user.email_verified_at)}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Last Updated</p>
                    <p className="text-sm text-gray-500">{formatDate(user.updated_at)}</p>
                  </div>
                </div>
                
                
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h3>
            <div className="text-center">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.name}
                  className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-gray-100"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 border-4 border-gray-100">
                  <UserIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <p className="text-sm text-gray-600">{user.name}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-blue-900">Total Tickets</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {totalTicketsQuery.isLoading ? '…' : totalTickets}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-yellow-900">Active Tickets</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {totalTicketsQuery.isLoading || resolvedTicketsQuery.isLoading ? '…' : activeTickets}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-900">Resolved</p>
                  <p className="text-2xl font-bold text-green-700">
                    {resolvedTicketsQuery.isLoading ? '…' : resolvedTickets}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}
