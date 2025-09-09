'use client'

// Clone lightweight version of admin create conversation for clients
import React, { useEffect, useState, useMemo } from 'react'
import { ArrowLeft, Loader2, Mail, Plus, User, UserCheck, MessageSquare, Sparkles, Search, X } from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'

interface UserResult { id: number | string; name: string; email: string; profile_photo_url?: string; role?: string }

export default function CreateConversationPage() {
  const [step, setStep] = useState<'list' | 'details'>('list')
  const [users, setUsers] = useState<UserResult[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [title, setTitle] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { void fetchUsers() }, [])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    
    const query = searchQuery.toLowerCase().trim()
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.role && user.role.toLowerCase().includes(query))
    )
  }, [users, searchQuery])

  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const res = await fetch(`${API_BASE}/api/users`, { headers: getAuthHeaders(true) })
      const data = await res.json()
      const list: UserResult[] = Array.isArray(data) ? data : (data.data ?? [])
      setUsers(list)
    } catch {
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const selectUser = (u: UserResult) => {
    setSelectedUser(u)
    setTitle(`Conversation with ${u.name}`)
    setStep('details')
  }

  const createConversation = async () => {
    if (!selectedUser) return
    setCreating(true)
    try {
      let res = await fetch(`${API_BASE}/api/conversations/direct`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ other_user_id: selectedUser.id, title: title || undefined, message: initialMessage || undefined })
      })
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/conversations`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({ title: title || undefined, participants: [selectedUser.id] })
        })
      }
      const payload = await res.json()
      const id = payload?.conversation?.id ?? payload?.id
      window.location.href = id ? `/clientdashboard/live-chat?conversation=${id}` : '/clientdashboard/live-chat'
    } catch {
      alert('Failed to create conversation')
    } finally {
      setCreating(false)
    }
  }

  const goBack = () => {
    if (step === 'details') { setStep('list'); setSelectedUser(null) }
    else window.location.href = '/clientdashboard/live-chat'
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-600/5 to-cyan-800/5"></div>
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-6 mb-2">
            <button 
              onClick={goBack} 
              className="group p-3 hover:bg-white/80 hover:shadow-lg rounded-xl transition-all duration-200 border border-gray-200/60 backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
            </button>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-cyan-400 rounded-xl shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create New Conversation</h1>
                <p className="text-gray-600 text-lg">Connect with team members instantly</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-12 -mt-6">
        {step === 'list' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden">
            {/* Users List */}
            <div className="p-8">
              {loadingUsers ? (
                <p>Loading...</p>
              ) : filteredUsers.length === 0 ? (
                <p>No users found.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {filteredUsers.map((u) => (
                    <button 
                      key={u.id} 
                      onClick={() => selectUser(u)} 
                      className="group w-full p-5 border border-gray-200/60 rounded-xl hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/50 transition-all duration-200 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <img 
                            src={u.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=3b82f6&color=fff`} 
                            alt={u.name} 
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all duration-200" 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{u.name}</div>
                          <div className="text-gray-600 text-sm truncate">{u.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'details' && selectedUser && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src={selectedUser.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=3b82f6&color=fff`} 
                  alt={selectedUser.name} 
                  className="w-16 h-16 rounded-full object-cover ring-3 ring-blue-200" 
                />
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
              {/* Conversation Title & Message */}
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Conversation Title"
                  className="w-full px-4 py-2 border rounded-xl"
                />
                <textarea
                  value={initialMessage} 
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Initial Message (optional)"
                  rows={4}
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>
              <button 
                onClick={createConversation} 
                disabled={creating || !title.trim()} 
                className="mt-6 w-full bg-blue-500 text-white py-3 rounded-xl"
              >
                {creating ? 'Creating...' : 'Start Conversation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
