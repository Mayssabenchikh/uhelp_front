'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  MoreHorizontal,
  MapPin,
  Ticket,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  XCircle
} from 'lucide-react'
import { useAppContext } from '@/context/Context'
import toast from 'react-hot-toast'

interface User {
  id: number
  name: string
  email: string
  role: string
  phone_number?: string
  profile_photo_url?: string
  department?: {
    id: number
    name: string
  }
  status: string
  location?: string
  created_tickets?: number
  resolved_tickets?: number
  created_at: string
}

interface Department {
  id: number
  name: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [filterHasPhone, setFilterHasPhone] = useState(false)
  const [filterHasPhoto, setFilterHasPhoto] = useState(false)

  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [activeMenuUserId, setActiveMenuUserId] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const router = useRouter()
  const { token } = useAppContext()

  const menuRef = useRef<HTMLDivElement | null>(null)

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

  // debounce search input -> 500ms
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 500)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedRole, selectedStatus, selectedDepartment, filterHasPhone, filterHasPhoto])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuUserId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const buildUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedRole !== 'all') params.append('role', selectedRole)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment)
      if (filterHasPhone) params.append('has_phone', '1')
      if (filterHasPhoto) params.append('has_photo', '1')

      const url = buildUrl(`/api/users?${params.toString()}`)

      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || data)
      } else {
        const text = await response.text()
        console.error('fetch users failed', response.status, text)
        toast.error(`Failed to fetch users (${response.status})`)
        setUsers([])
      }
    } catch (error) {
      console.error('Error fetching users', error)
      toast.error('Error fetching users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const url = buildUrl('/api/departments')
      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDepartments(data.data || data)
      } else {
        console.error('fetch departments failed', response.status)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const deleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return

    try {
      const url = buildUrl(`/api/users/${userId}`)
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json'
        },
      })

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId))
        setSelectedUsers(prev => prev.filter(id => id !== userId))
        toast.success('User deleted successfully')
      } else {
        const text = await response.text()
        console.error('delete failed', response.status, text)
        toast.error('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user', error)
      toast.error('Error deleting user')
    }
  }

  const deleteSelected = async () => {
    if (selectedUsers.length === 0) return
    if (!window.confirm(`Delete ${selectedUsers.length} selected user(s)?`)) return
    try {
      const responses = await Promise.all(
        selectedUsers.map(id =>
          fetch(buildUrl(`/api/users/${id}`), {
            method: 'DELETE',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Accept': 'application/json'
            },
          })
        )
      )
      const failed = responses.filter(r => !r.ok).length
      if (failed === 0) {
        setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)))
        setSelectedUsers([])
        toast.success('Selected users deleted')
      } else {
        toast.error(`Failed to delete ${failed} user(s)`)
        fetchUsers()
      }
    } catch (error) {
      console.error('Error deleting selected users', error)
      toast.error('Error deleting selected users')
    }
  }

  const clearSelection = () => setSelectedUsers([])

  const clearFilters = () => {
    setSearchInput('')
    setSearchTerm('') // déclenche immédiatement un refetch
    setSelectedRole('all')
    setSelectedStatus('all')
    setSelectedDepartment('all')
    setFilterHasPhone(false)
    setFilterHasPhoto(false)
    setShowFilters(false)
  }

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedUsers(selectedUsers.length === users.length ? [] : users.map(u => u.id))
  }

  const toggleActions = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation()
    setActiveMenuUserId(prev => prev === userId ? null : userId)
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'agent': return 'bg-blue-100 text-blue-800'
      case 'client': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'Active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by name, email, or ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearchTerm('') }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                aria-label="Clear search"
                title="Clear search"
              >
                <XCircle className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm bg-white min-w-[120px]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
            <option value="client">Client</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm bg-white min-w-[120px]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm bg-white min-w-[140px]"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id.toString()}>
                {dept.name}
              </option>
            ))}
          </select>

          <button
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            onClick={() => setShowFilters(sf => !sf)}
            type="button"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'More Filters'}
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50"
            title="Clear all filters"
          >
            Clear
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-700 mb-2">More filters</div>
            <div className="flex items-center gap-6">
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterHasPhone}
                  onChange={() => setFilterHasPhone(v => !v)}
                />
                Has phone number
              </label>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterHasPhoto}
                  onChange={() => setFilterHasPhoto(v => !v)}
                />
                Has profile photo
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900">
              All Users ({users.length})
            </span>
            {selectedUsers.length > 0 && (
              <span className="text-sm text-cyan-600">
                {selectedUsers.length} selected
              </span>
            )}
          </div>

          {/* Bulk actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              >
                Clear selection
              </button>
              <button
                onClick={deleteSelected}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete selected
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={user.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=06b6d4&color=ffffff`}
                          alt={user.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                        {user.phone_number && (
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {user.phone_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.department?.name || 'External'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {user.location || 'Not specified'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Ticket className="w-3 h-3" />
                      Created: {user.created_tickets ?? 0}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Resolved: {user.resolved_tickets ?? 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative" ref={activeMenuUserId === user.id ? menuRef : null}>
                      <button
                        onClick={(e) => toggleActions(e, user.id)}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenuUserId === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                          <button
                            onClick={() => router.push(`/admindashboard/users/${user.id}`)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            onClick={() => router.push(`/admindashboard/users/${user.id}/edit`)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                          >
                            <Edit className="w-4 h-4" />
                            Edit User
                          </button>
                          <div className="border-t border-gray-100">
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete User
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No users found</div>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
