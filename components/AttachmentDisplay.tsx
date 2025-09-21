'use client'

import React from 'react'
import { Download, File, Image, FileText, Archive } from 'lucide-react'
import { ticketService } from '@/services/api'

interface AttachmentDisplayProps {
  responseId: number
  attachmentName: string
  attachmentType: string
  attachmentSize?: number
  className?: string
}

export default function AttachmentDisplay({
  responseId,
  attachmentName,
  attachmentType,
  attachmentSize,
  className = ''
}: AttachmentDisplayProps) {
  const getIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-4 h-4" />
    } else if (mimeType.includes('pdf') || mimeType.includes('text')) {
      return <FileText className="w-4 h-4" />
    } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
      return <Archive className="w-4 h-4" />
    }
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes?: number): string => {
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

  const handleDownload = async () => {
    try {
      const response = await ticketService.downloadAttachment(responseId)
      
      // Create blob from response
      const blob = new Blob([response.data], { type: attachmentType })
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachmentName
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-50 rounded border ${className}`}>
      {getIcon(attachmentType)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachmentName}
        </p>
        {attachmentSize && (
          <p className="text-xs text-gray-500">
            {formatFileSize(attachmentSize)}
          </p>
        )}
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
        title="Download attachment"
      >
        <Download className="w-3 h-3" />
        Download
      </button>
    </div>
  )
}
