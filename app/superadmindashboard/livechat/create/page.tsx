// app/admindashboard/livechat/create/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  User, 
  Mail, 
  ArrowLeft, 
  UserCheck,
  Plus,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

interface UserResult {
  id: number | string
  name: string
  email: string
  avatar?: string
  role?: string
}

export default function CreateConversationPage() {
  const [step, setStep] = useState<'list' | 'details'>('list')
  const [users, setUsers] = useState<UserResult[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [title, setTitle] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  // Récupérer l'utilisateur connecté
useEffect(() => {
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/me`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to fetch current user')
      const data = await res.json()
      const user = data.user // ✅ corrige ici
      setCurrentUserId(String(user.id))
      setCurrentUserEmail(user.email) // utile pour filtre supplémentaire si besoin
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }
  fetchCurrentUser()
}, [])


// Fetch users après récupération de l'utilisateur connecté
useEffect(() => {
  if (currentUserId !== null) fetchUsers()
}, [currentUserId])

const fetchUsers = async () => {
  setLoadingUsers(true)
  try {
    const response = await fetch(`${API_BASE}/users`, { headers: authHeaders() })
    if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`)
    const data = await response.json()
    const allUsers: UserResult[] = Array.isArray(data) ? data : (data.data || data.users || [])

    if (!currentUserId) {
      console.warn('Current user ID not defined yet')
      setUsers(allUsers)
      return
    }

    // Exclure l'utilisateur connecté de façon sûre
const filteredUsers = allUsers.filter(u => String(u.id) !== String(currentUserId))
    setUsers(filteredUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    setUsers([])
  } finally {
    setLoadingUsers(false)
  }
}


  const selectUser = (user: UserResult) => {
    if (String(user.id) === currentUserId) {
      alert("You cannot start a conversation with yourself.")
      return
    }
    setSelectedUser(user)
    setTitle(`Conversation with ${user.name}`)
    setStep('details')
  }

  const createConversation = async () => {
    if (!selectedUser) return
    if (String(selectedUser.id) === currentUserId) {
      alert("Cannot create a conversation with yourself.")
      return
    }

    setCreating(true)
    try {
      let response = await fetch(`${API_BASE}/conversations/direct`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          other_user_id: selectedUser.id,
          title: title.trim() || `Conversation with ${selectedUser.name}`,
          message: initialMessage.trim() || undefined
        })
      })
      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_BASE}/conversations`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            title: title.trim() || `Conversation with ${selectedUser.name}`,
            message: initialMessage.trim() || undefined,
            participants: [selectedUser.id]
          })
        })
      }
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create conversation: ${response.status} - ${errorText}`)
      }
      const conversation = await response.json()
      const conversationId = conversation.id || conversation.conversation?.id
      if (conversationId) {
        window.location.href = `/admindashboard/livechat?conversation=${conversationId}`
      } else {
        window.location.href = '/admindashboard/livechat'
      }
    } catch (error) {
      console.error('Create conversation error:', error)
      alert('Failed to create conversation. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const goBack = () => {
    if (step === 'details') {
      setStep('list')
      setSelectedUser(null)
    } else {
      window.location.href = '/admindashboard/livechat'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={goBack} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Conversation</h1>
            <p className="text-gray-600">Select a user to start a conversation</p>
          </div>
        </div>

        {step === 'list' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No users available</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => selectUser(user)}
                      className="w-full p-4 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                          {user.role && (
                            <div className="text-xs text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full inline-block mt-1">
                              {user.role}
                            </div>
                          )}
                        </div>
                        <UserCheck className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {step === 'details' && selectedUser && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Conversation Details</h2>
              <p className="text-gray-600">Configure your conversation with {selectedUser.name}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}`}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium text-gray-900">{selectedUser.name}</div>
                  <div className="text-sm text-gray-600">{selectedUser.email}</div>
                </div>
                <button
                  onClick={() => setStep('list')}
                  className="ml-auto text-sm text-cyan-600 hover:text-cyan-700"
                >
                  Change user
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversation Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter conversation title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Message (Optional)
                </label>
                <textarea
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Type your first message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('list')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={createConversation}
                disabled={creating || !title.trim()}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2",
                  creating || !title.trim()
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-cyan-500 text-white hover:bg-cyan-600"
                )}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Conversation
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
