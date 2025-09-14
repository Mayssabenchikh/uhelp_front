'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, Search, MessageSquareIcon, Loader2, AlertCircle, Users, Check } from 'lucide-react'
import { chatService } from '@/services/chatService'
import { userService } from '@/services/api'
import { useAppContext } from '@/context/Context'
import { toast } from 'react-hot-toast'

interface UserOption {
  id: number
  name: string
  email: string
  role: string
  department?: string
  avatar?: string
}

interface CreateConversationData {
  title: string
  participants: number[]
  type: 'private' | 'group'
}

export default function CreateConversationPage() {
  const router = useRouter()
  const { user } = useAppContext()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([])
  const [conversationTitle, setConversationTitle] = useState('')
  const [conversationType, setConversationType] = useState<'private' | 'group'>('private')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch users (clients)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: async () => {
      try {
        // Try to fetch users for chat - you may need to implement this endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000/api'}/users?role=client&search=${searchTerm}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          }
        })
        if (!response.ok) throw new Error('Failed to fetch users')
        return await response.json()
      } catch (error) {
        console.error('Error fetching users:', error)
        // Return mock data for now
        return {
          data: [
            { id: 16, name: 'Client Test', email: 'client@example.com', role: 'client', department: 'Support' },
            { id: 17, name: 'John Doe', email: 'john@example.com', role: 'client', department: 'Sales' },
            { id: 18, name: 'Jane Smith', email: 'jane@example.com', role: 'client', department: 'Marketing' }
          ]
        }
      }
    },
    enabled: isMounted
  })

  const users: UserOption[] = usersData?.data || []

  // Filter out any invalid user objects
  const validUsers = users.filter(user => 
    user && 
    typeof user === 'object' && 
    user.id && 
    user.name && 
    user.email
  )

  // Create conversation mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateConversationData) => chatService.createConversation(data),
    onSuccess: (response) => {
      toast.success('Conversation created successfully')
      router.push('/agentdashboard/client-chat')
    },
    onError: (error: any) => {
      console.error('Error creating conversation:', error)
      toast.error('Error creating conversation')
    }
  })

  const toggleUserSelection = (selectedUser: UserOption) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === selectedUser.id)
      if (isSelected) {
        return prev.filter(u => u.id !== selectedUser.id)
      } else {
        return [...prev, selectedUser]
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one participant')
      return
    }

    const participantIds = selectedUsers.map(u => u.id)
    
    // Add current user to participants
    if (user?.id && !participantIds.includes(user.id)) {
      participantIds.push(user.id)
    }

    const data: CreateConversationData = {
      title: conversationTitle || `Chat with ${selectedUsers.map(u => String(u.name || '')).join(', ')}`,
      participants: participantIds,
      type: conversationType
    }

    createMutation.mutate(data)
  }

  const filteredUsers = validUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/agentdashboard/client-chat')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chat
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquareIcon className="h-7 w-7 text-teal-600" />
            New Conversation
          </h1>
          <p className="text-gray-600 mt-1">Create a new conversation with clients</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Conversation Details</h2>
          <p className="text-gray-600 mt-1">Configure your new conversation</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Conversation Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Conversation Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="private"
                  checked={conversationType === 'private'}
                  onChange={(e) => setConversationType(e.target.value as 'private' | 'group')}
                  className="sr-only"
                />
                <div className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                  conversationType === 'private' 
                    ? 'border-teal-500 bg-teal-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <MessageSquareIcon className="w-5 h-5 text-teal-600" />
                  <span className="font-medium">Private Chat</span>
                </div>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="group"
                  checked={conversationType === 'group'}
                  onChange={(e) => setConversationType(e.target.value as 'private' | 'group')}
                  className="sr-only"
                />
                <div className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                  conversationType === 'group' 
                    ? 'border-teal-500 bg-teal-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <Users className="w-5 h-5 text-teal-600" />
                  <span className="font-medium">Group Chat</span>
                </div>
              </label>
            </div>
          </div>

          {/* Conversation Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
              Conversation Title
            </label>
            <input
              type="text"
              id="title"
              value={conversationTitle}
              onChange={(e) => setConversationTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter a conversation title (optional)"
            />
          </div>

          {/* User Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Clients
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Selected Participants ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm"
                  >
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {String(user.name || '').charAt(0).toUpperCase()}
                    </div>
                    <span>{String(user.name || '')}</span>
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(user)}
                      className="text-teal-600 hover:text-teal-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users List */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Available Clients
            </label>
            <div className="border border-gray-200 rounded-xl max-h-64 overflow-y-auto">
              {usersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                  <span className="ml-2 text-gray-600">Loading users...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No clients found</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUsers.some(u => u.id === user.id)
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user)}
                      className={`flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-teal-50 border-teal-200' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {String(user.name || '').charAt(0).toUpperCase()}
                        </div>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{String(user.name || '')}</div>
                        <div className="text-sm text-gray-600">{String(user.email || '')}</div>
                        {user.department && (
                          <div className="text-xs text-gray-500">{String(user.department || '')}</div>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 capitalize">
                        {String(user.role || '')}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Error Display */}
          {createMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 text-sm font-medium">
                  {createMutation.error instanceof Error 
                    ? createMutation.error.message 
                    : 'Error creating conversation'}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.push('/agentdashboard/client-chat')}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || selectedUsers.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Conversation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
