'use client'

import { useState, useEffect, useRef } from 'react'
import { User as UserIcon, Mail, Phone, Lock, Camera } from 'lucide-react'
import { useAppContext } from '@/context/Context'
import { API_BASE, getStoredToken } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user } = useAppContext()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
    if (user) {
      setFormData({
        fullName: user.name || '',
        email: user.email || '',
        phone: user.phone || user.phone_number || '',
        password: '',
        confirmPassword: '',
      })
      if (user.profile_photo) {
        setPreviewUrl(user.profile_photo.startsWith('http') ? user.profile_photo : `${API_BASE}/storage/${user.profile_photo}`)
      } else if (user.profile_photo_url) {
        setPreviewUrl(user.profile_photo_url)
      } else {
        setPreviewUrl(null)
      }
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    try {
      // client-side validation
      if (formData.password && formData.password !== formData.confirmPassword) {
        setMessage('Passwords do not match')
        setIsLoading(false)
        return
      }

      if (!user || !user.id) {
        setMessage('User not loaded')
        setIsLoading(false)
        return
      }

      const token = getStoredToken()
      if (!token) {
        toast.error('No token found — please login again')
        setIsLoading(false)
        return
      }

      // Build FormData for multipart upload
      const payload = new FormData()
      // Laravel uses _method override to allow PUT via multipart/form-data
      payload.append('_method', 'PUT')
      payload.append('name', formData.fullName)
      payload.append('email', formData.email)
      if (formData.phone) payload.append('phone_number', formData.phone)
      if (formData.password) payload.append('password', formData.password)
      // role not changed here; backend should use existing role if not present

      // file
      const file = fileInputRef.current?.files?.[0]
      if (file) {
        payload.append('profile_photo', file)
      }

      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'POST', // POST with _method=PUT
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type: browser will set multipart boundary
        },
        body: payload,
      })

      if (!res.ok) {
        const text = await res.text()
        let msg = text
        try {
          const json = JSON.parse(text)
          msg = json.message ?? JSON.stringify(json)
        } catch {}
        throw new Error(`Update failed (${res.status}): ${msg}`)
      }

      const data = await res.json()
      toast.success(data.message ?? 'Profile updated successfully')

      // refresh app state (AppProvider will re-fetch /api/me if necessary)
      // simplest: reload current route so context picks updated user
      router.refresh()
      // optional: keep user on page and show success message
      setMessage('Profile updated successfully!')
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
    } catch (err: any) {
      console.error('Profile update error', err)
      toast.error(err?.message ?? 'Error updating profile')
      setMessage('Error updating profile. ' + (err?.message ?? ''))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-white rounded-full overflow-hidden border-4 border-white shadow-lg">
               {previewUrl ? (
  <img
    src={previewUrl}
    alt="Profile"
    className="w-full h-full object-cover"
  />
) : (
  <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-700 text-3xl font-bold">
    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
  </div>
)}

              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white hover:bg-cyan-600 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{user?.name || 'User Name'}</h2>
              <p className="text-cyan-100">{user?.email || 'user@example.com'}</p>
              <p className="text-cyan-100 text-sm">{user?.role || 'Client'}</p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="p-6">
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${message.includes('successfully') ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  <UserIcon className="w-4 h-4 inline mr-2" /> Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" /> Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" /> Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  value={user?.role || 'Client'}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            </div>

            {/* Password Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Change Password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" /> New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" /> Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
