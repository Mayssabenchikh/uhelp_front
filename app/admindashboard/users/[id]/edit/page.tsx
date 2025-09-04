'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Save,
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  MapPin,
  Camera,
  Building2,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn, API_BASE, getAuthHeaders } from '@/lib/utils'
import toast from 'react-hot-toast'

interface UpdateUserData {
  name?: string
  email?: string
  password?: string
  role?: 'agent' | 'client'
  phone_number?: string
  location?: string
  profile_photo?: File | null
  department_id?: number | null
}

interface User {
  id: number
  name: string
  email: string
  role: 'agent' | 'client'
  phone_number?: string
  location?: string
  profile_photo?: string
  profile_photo_url?: string
  department_id?: number | null
  department?: {
    id: number
    name: string
  } | null
  created_at: string
  email_verified_at?: string | null
}

interface Department {
  id: number
  name: string
  description?: string
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

async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/api/departments`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch departments: ${text}`)
  }
  const json = await res.json()
  return json.data ?? json
}

/**
 * Update user with FormData.
 * Important:
 * - Laravel/PHP typically does not populate $_FILES for PUT requests when using multipart/form-data.
 * - Therefore we send a POST with a `_method=PUT` override which Laravel understands.
 * - Also we carefully parse the error response to expose validation errors to the UI.
 */
async function updateUser({ id, data }: { id: string; data: FormData }) {
  const headers = { ...getAuthHeaders() } as Record<string, string>
  // Do not set Content-Type; let the browser set it (with boundary)
  if (headers['Content-Type']) delete headers['Content-Type']
  if (headers['content-type']) delete headers['content-type']

  // Laravel-friendly method override for file uploads
  data.append('_method', 'PUT')

  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'POST', // use POST + _method=PUT so PHP/Laravel correctly parses multipart data
    headers,
    body: data
  })

  let json: any = null
  try {
    json = await res.json()
  } catch (e) {
    // ignore parse errors
  }

  if (!res.ok) {
    const message = json?.message || `HTTP ${res.status}: Failed to update user`
    const err: any = new Error(message)
    if (json?.errors) err.errors = json.errors
    throw err
  }

  return json
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string
  const queryClient = useQueryClient()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [isMounted, setIsMounted] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [removeCurrentPhoto, setRemoveCurrentPhoto] = useState(false)
  const [formData, setFormData] = useState<UpdateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'client',
    phone_number: '',
    location: '',
    profile_photo: null,
    department_id: null
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const { data: user, isLoading: userLoading, error: userError } = useQuery<User, Error>({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: isMounted && !!userId
  })

  const { data: departments, isLoading: departmentsLoading } = useQuery<Department[], Error>({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: isMounted
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name ?? '',
        email: user.email ?? '',
        password: '',
        role: user.role ?? 'client',
        phone_number: user.phone_number ?? '',
        location: user.location ?? '',
        profile_photo: null,
        department_id: user.department_id ?? null
      })
      setPreviewImage(user.profile_photo_url ?? null)
      setRemoveCurrentPhoto(false)
    }
  }, [user])

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => updateUser({ id, data }),
    onSuccess: () => {
      toast.success('User updated successfully!')
      setFieldErrors({})
      // invalidate queries so UI refreshes
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push('/admindashboard/users')
    },
    onError: (error: any) => {
      // If the backend returned validation errors, attach them to the form
      if (error?.errors) setFieldErrors(error.errors)
      toast.error(error?.message || 'Failed to update user')
    }
  })

  const handleInputChange = (field: keyof UpdateUserData, value: string | number | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPreviewImage(reader.result as string)
      reader.readAsDataURL(file)
      handleInputChange('profile_photo', file)
      setRemoveCurrentPhoto(false)
    } else {
      if (!user?.profile_photo_url) setPreviewImage(null)
      handleInputChange('profile_photo', null)
    }
  }

  const removeImage = () => {
    setPreviewImage(null)
    setRemoveCurrentPhoto(true)
    handleInputChange('profile_photo', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const restoreCurrentImage = () => {
    if (user?.profile_photo_url) {
      setPreviewImage(user.profile_photo_url)
      setRemoveCurrentPhoto(false)
      handleInputChange('profile_photo', null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name?.trim()) {
      toast.error('Name is required')
      return
    }
    if (!formData.email?.trim()) {
      toast.error('Email is required')
      return
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    const submitData = new FormData()

    if ((formData.name ?? '') !== (user?.name ?? '')) submitData.append('name', formData.name ?? '')
    if ((formData.email ?? '') !== (user?.email ?? '')) submitData.append('email', formData.email ?? '')
    if (formData.password && formData.password.trim()) submitData.append('password', formData.password)
    if ((formData.role ?? '') !== (user?.role ?? '')) submitData.append('role', formData.role ?? '')
    if ((formData.phone_number ?? '') !== (user?.phone_number ?? '')) submitData.append('phone_number', formData.phone_number ?? '')
    if ((formData.location ?? '') !== (user?.location ?? '')) submitData.append('location', formData.location ?? '')
    const currentDept = user?.department_id ?? null
    if ((formData.department_id ?? null) !== (currentDept ?? null)) {
      submitData.append('department_id', formData.department_id != null ? String(formData.department_id) : '')
    }

    if (formData.profile_photo instanceof File) {
      submitData.append('profile_photo', formData.profile_photo)
    }
    if (removeCurrentPhoto) {
      submitData.append('remove_profile_photo', '1')
      // do not append an empty file; backend only needs the flag
    }

    if (
      !submitData.has('name') &&
      !submitData.has('email') &&
      !submitData.has('password') &&
      !submitData.has('role') &&
      !submitData.has('phone_number') &&
      !submitData.has('location') &&
      !submitData.has('department_id') &&
      !submitData.has('profile_photo') &&
      !submitData.has('remove_profile_photo')
    ) {
      toast('No changes to save')
      return
    }

    updateMutation.mutate({ id: userId, data: submitData })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'agent': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'client': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'agent': return <UserIcon className="w-4 h-4" />
      case 'client': return <CheckCircle className="w-4 h-4" />
      default: return <UserIcon className="w-4 h-4" />
    }
  }

  const getStatusBadge = (user?: User) => {
    if (!user) return null
    const isActive = !!user.email_verified_at
    return (
      <span className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        isActive ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
      )}>
        {isActive ? 'Active' : 'Pending Verification'}
      </span>
    )
  }

  if (!isMounted) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
  }

  if (userError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Error Loading User</h2>
          </div>
          <p className="text-red-700 mt-2">{userError.message}</p>
          <button
            onClick={() => router.push('/admindashboard/users')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Users
          </button>
        </div>
      </div>
    )
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading user data...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
              {getStatusBadge(user)}
            </div>
            <p className="text-gray-600">
              Update user information for {user?.name} ({user?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admindashboard/users')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            form="user-form"
            type="submit"
            disabled={(updateMutation.status === 'pending')}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {(updateMutation.status === 'pending') ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {(updateMutation.status === 'pending') ? 'Updating...' : 'Update User'}
          </button>
        </div>
      </div>

      {/* Form */}
      <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        id="name"
                        value={formData.name ?? ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter full name..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={255}
                      />
                    </div>
                    {fieldErrors.name?.length ? (
                      <div className="mt-2 text-sm text-red-600">
                        {fieldErrors.name.map((error) => (
                          <p key={error}>{error}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        id="email"
                        value={formData.email ?? ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.email[0]}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={formData.password ?? ''}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter new password (leave empty to keep current)..."
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to keep current password. Minimum 6 characters if changing.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        id="phone_number"
                        value={formData.phone_number ?? ''}
                        onChange={(e) => handleInputChange('phone_number', e.target.value)}
                        placeholder="Enter phone number..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={20}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        id="location"
                        value={formData.location ?? ''}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Enter location..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={255}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account & Department */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Member Since</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {user?.role?.toUpperCase() || 'N/A'}
                  </div>
                  <div className="text-sm text-blue-600">Current Role</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {user?.email_verified_at ? 'Verified' : 'Pending'}
                  </div>
                  <div className="text-sm text-green-600">Email Status</div>
                </div>
              </div>
            </div>

            {formData.role === 'agent' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">Department Assignment</h2>
                </div>

                <div>
                  <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    id="department_id"
                    value={formData.department_id ?? ''}
                    onChange={(e) => handleInputChange('department_id', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={departmentsLoading}
                  >
                    <option value="">Select department (optional)</option>
                    {departments?.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {departmentsLoading && <p className="text-sm text-gray-500 mt-1">Loading departments...</p>}
                  {user?.department && <p className="text-sm text-gray-600 mt-1">Current: {user.department.name}</p>}
                </div>
              </div>
            )}
             {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Update Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Only changed fields will be updated</li>
                    <li>• Leave password empty to keep current</li>
                    <li>• Email changes may require re-verification</li>
                    <li>• Role changes affect user permissions</li>
                    <li>• Agents can be assigned to departments</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Photo */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h3>
              <div className="space-y-4">
                {previewImage ? (
                  <div className="relative">
                    <img src={previewImage} alt="Profile preview" className="w-full h-48 object-cover rounded-lg" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                    {user?.profile_photo_url && !formData.profile_photo && (
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">Current Photo</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No photo selected</p>
                  </div>
                )}

                <label className="block">
                  <span className="sr-only">Choose profile photo</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="profile_photo"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </label>

                {removeCurrentPhoto && user?.profile_photo_url && (
                  <button type="button" onClick={restoreCurrentImage} className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                    Restore Current Photo
                  </button>
                )}

                <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
              </div>
            </div>

            {/* Role Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Role</h3>
              <div className="space-y-2">
                {(['agent', 'client'] as const).map((role) => (
                  <label key={role} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={formData.role === role}
                      onChange={(e) => handleInputChange('role', e.target.value as any)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-lg border-2 transition-all",
                      formData.role === role ? getRoleColor(role) + " ring-2 ring-offset-1" : "border-gray-200 hover:border-gray-300"
                    )}>
                      {getRoleIcon(role)}
                      <span className="font-medium capitalize">{role}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-600">
                    <p><strong>Agent:</strong> Can manage tickets</p>
                    <p><strong>Client:</strong> Can create tickets</p>
                  </div>
                </div>
              </div>
            </div>

           
          </div>
        </div>
      </form>
    </div>
  )
}
