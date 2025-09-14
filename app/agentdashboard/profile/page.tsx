'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/services/api'
import { User } from '@/types'
import { toast } from 'react-hot-toast'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    phone_number: ''
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await userService.getProfile()
      
      // Le backend peut renvoyer soit {success: true, data: userData} soit {user: userData}
      let userData = null
      const responseAny = response as any
      
      if (response.success && response.data) {
        userData = response.data
      } else if (responseAny.user) {
        userData = responseAny.user
      } else if (response.data) {
        userData = response.data
      } else {
        // Si aucune structure n'est reconnue, essayons response directement
        userData = response
      }

      if (userData && (userData.id || userData.name || userData.email)) {
        setUser(userData)
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          password: '',
          confirmPassword: '',
          location: userData.location || '',
          phone_number: userData.phone_number || ''
        })
        // Set image preview if user has an avatar
        const avatarUrl = userData.avatar || userData.profile_photo_url || userData.profile_photo
        if (avatarUrl) {
          // Ensure the URL is complete
          const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${avatarUrl}`
          setImagePreview(fullAvatarUrl)
        } else {
          setImagePreview(null)
        }
      } else {
        console.error('No valid user data found in response:', response)
        toast.error('Format de réponse inattendu du serveur')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Erreur lors du chargement du profil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      if (formData.password && formData.password !== formData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas')
        return
      }

      if (!user?.id) {
        toast.error('ID utilisateur manquant')
        return
      }

      // First, update basic profile data
      const updateData: any = {
        id: user.id, // Ajouter l'ID utilisateur
        name: formData.name,
        email: formData.email,
        location: formData.location,
        phone_number: formData.phone_number
      }

      if (formData.password) {
        updateData.password = formData.password
        updateData.password_confirmation = formData.confirmPassword
      }

      console.log('Sending update data:', updateData) // Debug log

      const response = await userService.updateProfile(updateData)
      console.log('Update response:', response) // Debug log
      
      // Gérer différents formats de réponse
      const responseAny = response as any
      let updatedUser = null
      let isSuccess = false
      
      if (response.success && response.data) {
        updatedUser = response.data
        isSuccess = true
      } else if (responseAny.user) {
        updatedUser = responseAny.user
        isSuccess = true
      } else if (response.data) {
        updatedUser = response.data
        isSuccess = true
      } else if (responseAny.id || responseAny.name || responseAny.email) {
        // La réponse est directement l'utilisateur mis à jour
        updatedUser = responseAny
        isSuccess = true
      }
      
      if (isSuccess && updatedUser) {

        // If there's a new image, upload it
        if (selectedImage) {
          try {
            // Use the same approach as client dashboard - update via users/{id} endpoint
            const formData = new FormData()
            formData.append('_method', 'PUT')
            formData.append('profile_photo', selectedImage)
            formData.append('name', updatedUser.name)
            formData.append('email', updatedUser.email)
            if (updatedUser.location) formData.append('location', updatedUser.location)
            if (updatedUser.phone_number) formData.append('phone_number', updatedUser.phone_number)
            
            // Direct API call like client dashboard
            const token = localStorage.getItem('access_token') || localStorage.getItem('token')
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            
            console.log('Uploading image via users endpoint...') // Debug log
            
            const imageResponse = await fetch(`${API_BASE}/api/users/${user.id}`, {
              method: 'POST', // POST with _method=PUT
              headers: {
                Authorization: `Bearer ${token}`,
                // DO NOT set Content-Type: browser will set multipart boundary
              },
              body: formData,
            })

            if (imageResponse.ok) {
              const imageData = await imageResponse.json()
              console.log('Avatar upload response:', imageData) // Debug log
              
              // Update the user with new avatar data
              if (imageData.user?.profile_photo) {
                updatedUser = { ...updatedUser, profile_photo: imageData.user.profile_photo }
              } else if (imageData.user?.avatar) {
                updatedUser = { ...updatedUser, avatar: imageData.user.avatar }
              }
              
              console.log('Avatar uploaded successfully:', updatedUser.profile_photo || updatedUser.avatar)
            } else {
              throw new Error(`Avatar upload failed: ${imageResponse.status}`)
            }
          } catch (imageError) {
            console.error('Error uploading image:', imageError)
            toast.error('Profile updated but image upload failed')
          }
        }

        setUser(updatedUser)
        setIsEditing(false)
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
        setSelectedImage(null)
        toast.success('Profil mis à jour avec succès')
      } else {
        console.error('Update failed:', response)
        toast.error(responseAny.message || response.message || 'Erreur lors de la mise à jour')
      }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        <span className="ml-2 text-gray-600">Chargement du profil...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Impossible de charger les informations du profil</p>
          <button 
            onClick={fetchProfile}
            className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header Section with Gradient */}
          <div className="bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600 px-8 py-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Profile Picture */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/30 shadow-2xl bg-gray-200 transition-transform duration-300 group-hover:scale-105">
                    {imagePreview || user?.avatar || user?.profile_photo_url || user?.profile_photo ? (
                      <img
                        src={imagePreview || 
                             (user?.avatar?.startsWith('http') ? user.avatar : `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${user?.avatar}`) ||
                             (user?.profile_photo_url?.startsWith('http') ? user.profile_photo_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${user?.profile_photo_url}`) ||
                             (user?.profile_photo?.startsWith('http') ? user.profile_photo : `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${user?.profile_photo}`)
                        }
                        alt={user?.name || 'User avatar'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('Image load error:', e)
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/40 flex items-center justify-center text-white text-3xl font-bold backdrop-blur-sm">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  
                  {/* Upload button overlay */}
                  {isEditing && (
                    <label 
                      htmlFor="avatar-upload"
                      className="absolute bottom-2 right-2 bg-white text-teal-600 p-3 rounded-full cursor-pointer hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </label>
                  )}
                  
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* User Info */}
                <div className="text-center lg:text-left">
                  <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
                  <p className="text-teal-100 text-lg mb-4">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'No Role Assigned'}
                  </p>
                  
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-medium"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          </div>

          {/* Form Section */}
          <div className="p-8">
            {isEditing && selectedImage && (
              <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-teal-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-teal-800 font-medium">Nouvelle image sélectionnée: {selectedImage.name}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Location Field */}
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700">
                  Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Your location"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="space-y-2">
                <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-700">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Your phone number"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2 lg:col-span-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder={!isEditing ? "•••••••••••••••••" : "New password"}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Confirm Password Field - Only show when editing */}
              {isEditing && formData.password && (
                <div className="space-y-2 lg:col-span-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your new password"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setSelectedImage(null)
                    // Remettre l'image originale
                    const originalAvatarUrl = user?.avatar || user?.profile_photo_url || user?.profile_photo
                    if (originalAvatarUrl) {
                      const fullAvatarUrl = originalAvatarUrl.startsWith('http') ? originalAvatarUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${originalAvatarUrl}`
                      setImagePreview(fullAvatarUrl)
                    } else {
                      setImagePreview(null)
                    }
                    setFormData({
                      name: user?.name || '',
                      email: user?.email || '',
                      password: '',
                      confirmPassword: '',
                      location: user?.location || '',
                      phone_number: user?.phone_number || ''
                    })
                  }}
                  className="flex-1 sm:flex-none px-8 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}