'use client'

import React from 'react'
import { Download, Image, FileText, File, Archive, Video, Music, ExternalLink } from 'lucide-react'
import { Attachment } from '@/types'
import { chatService } from '@/services/chatService'
import toast from 'react-hot-toast'

interface ChatAttachmentProps {
  attachment: Attachment | any
  isFromCurrentUser?: boolean
  onDownload?: (attachment: any) => void
  className?: string
}

const ChatAttachment: React.FC<ChatAttachmentProps> = ({
  attachment,
  isFromCurrentUser = false,
  onDownload,
  className = ''
}) => {
  const url = attachment?.url || attachment?.path || attachment?.download_url || attachment?.file_url || ''
  const mime = attachment?.mime || attachment?.mime_type || ''
  const name = attachment?.filename || attachment?.name || 'attachment'
  const size = attachment?.size || 0

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-4 h-4" />
    } else if (mimeType.startsWith('video/')) {
      return <Video className="w-4 h-4" />
    } else if (mimeType.startsWith('audio/')) {
      return <Music className="w-4 h-4" />
    } else if (mimeType.includes('pdf') || mimeType.includes('text')) {
      return <FileText className="w-4 h-4" />
    } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return <Archive className="w-4 h-4" />
    }
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return ''
    
    const sizes = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let i = 0
    
    while (size >= 1024 && i < sizes.length - 1) {
      size /= 1024
      i++
    }
    
    return `${Math.round(size * 100) / 100} ${sizes[i]}`
  }

  const isImage = typeof mime === 'string' ? mime.startsWith('image/') : /\.(png|jpe?g|gif|webp|svg)$/i.test(String(url))
  const isVideo = typeof mime === 'string' ? mime.startsWith('video/') : /\.(mp4|mov|avi|webm|mkv)$/i.test(String(url))

  const handleDownload = async () => {
    try {
      console.log('Attachment data:', attachment) // Debug log
      
      if (onDownload) {
        onDownload(attachment)
        return
      }

      // Check if attachment has a valid ID
      const attachmentId = attachment.id || attachment.attachment_id
      
      console.log('Available attachment fields:', Object.keys(attachment))
      console.log('Attachment ID found:', attachmentId)
      console.log('Attachment URL found:', url)
      
      if (attachmentId) {
        console.log('Attempting secure download for attachment ID:', attachmentId)
        
        try {
          // First, get attachment info for debugging
          try {
            const info = await chatService.getAttachmentInfo(attachmentId)
            console.log('Attachment info:', info)
          } catch (infoError) {
            console.warn('Could not get attachment info:', infoError)
          }

          const response = await chatService.downloadChatAttachment(attachmentId)
          
          // Create blob from response
          const blob = await response.blob()
          
          // Get filename from response headers or use fallback
          const contentDisposition = response.headers.get('content-disposition')
          let filename = name
          
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/['"]/g, '')
            }
          }
          
          // Create download link
          const downloadUrl = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = filename
          document.body.appendChild(link)
          link.click()
          
          // Cleanup
          document.body.removeChild(link)
          window.URL.revokeObjectURL(downloadUrl)
          
          toast.success('Fichier téléchargé avec succès')
          return
        } catch (apiError) {
          console.error('Secure download failed, trying fallback:', apiError)
          // Continue to fallback method
        }
      }

      // Fallback: try direct URL download
      if (url) {
        console.log('Using fallback direct download for URL:', url)
        
        try {
          // Try to fetch with authentication first
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('access_token') || ''}`
            }
          })
          
          if (response.ok) {
            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
            toast.success('Fichier téléchargé avec succès')
          } else {
            // If authenticated fetch fails, try direct link
            const link = document.createElement('a')
            link.href = url
            link.download = name
            link.target = '_blank'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        } catch (fetchError) {
          console.error('Authenticated fetch failed, trying direct link:', fetchError)
          // Last resort: direct link
          const link = document.createElement('a')
          link.href = url
          link.download = name
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } else {
        toast.error('Aucun moyen de télécharger ce fichier')
      }
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Échec du téléchargement du fichier')
    }
  }

  const getSecureViewUrl = () => {
    const attachmentId = attachment.id || attachment.attachment_id
    
    if (attachmentId) {
      try {
        return chatService.getSecureAttachmentUrl(attachmentId)
      } catch (error) {
        console.warn('Failed to generate secure URL, using fallback:', error)
      }
    }
    
    // Fallback to original URL
    return url
  }

  return (
    <div className={`rounded-xl p-3 ${isFromCurrentUser ? 'bg-white/20' : 'bg-slate-50'} ${className}`}>
      {/* Image Preview */}
      {isImage && url && (
        <div className="space-y-2">
          <a href={getSecureViewUrl()} target="_blank" rel="noreferrer" className="block">
            <img 
              src={getSecureViewUrl()} 
              alt={name} 
              className="max-h-40 max-w-full rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer object-cover" 
              onError={(e) => {
                console.error('Image failed to load:', getSecureViewUrl())
                // Optionally show a fallback or hide the image
                e.currentTarget.style.display = 'none'
              }}
            />
          </a>
          <div className="flex items-center justify-between text-xs">
            <span className={`truncate flex-1 ${isFromCurrentUser ? 'text-white/90' : 'text-slate-600'}`}>
              {name}
            </span>
            {size > 0 && (
              <span className={`ml-2 ${isFromCurrentUser ? 'text-white/70' : 'text-slate-500'}`}>
                {formatFileSize(size)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Video Preview */}
      {isVideo && url && (
        <div className="space-y-2">
          <video 
            src={getSecureViewUrl()}
            controls 
            className="max-h-40 max-w-full rounded-lg shadow-sm"
            preload="metadata"
          >
            <source src={url} type={mime} />
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
          <div className="flex items-center justify-between text-xs">
            <span className={`truncate flex-1 ${isFromCurrentUser ? 'text-white/90' : 'text-slate-600'}`}>
              {name}
            </span>
            {size > 0 && (
              <span className={`ml-2 ${isFromCurrentUser ? 'text-white/70' : 'text-slate-500'}`}>
                {formatFileSize(size)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* File Document */}
      {!isImage && !isVideo && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`${isFromCurrentUser ? 'text-white/90' : 'text-slate-600'}`}>
              {getFileIcon(mime)}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isFromCurrentUser ? 'text-white' : 'text-slate-900'}`}>
                {name}
              </p>
              {size > 0 && (
                <p className={`text-xs ${isFromCurrentUser ? 'text-white/70' : 'text-slate-500'}`}>
                  {formatFileSize(size)}
                </p>
              )}
            </div>
          </div>
          {url && (
            <button 
              onClick={handleDownload}
              className={`p-1 rounded hover:bg-black/10 transition-colors ${isFromCurrentUser ? 'text-white/90 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}
              title="Télécharger"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ChatAttachment
