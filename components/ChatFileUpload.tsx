'use client'

import React, { useRef, useState } from 'react'
import { Paperclip, X, Image, FileText, File, Archive, Video, Music } from 'lucide-react'

interface ChatFileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  onFileRemove: (index: number) => void
  maxFiles?: number
  maxSize?: number // in MB
  acceptedTypes?: string[]
  disabled?: boolean
}

const ChatFileUpload: React.FC<ChatFileUploadProps> = ({
  files,
  onFilesChange,
  onFileRemove,
  maxFiles = 10,
  maxSize = 50, // 50MB
  acceptedTypes = [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ],
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const getFileIcon = (file: File) => {
    const type = file.type
    if (type.startsWith('image/')) {
      return <Image className="w-4 h-4" />
    } else if (type.startsWith('video/')) {
      return <Video className="w-4 h-4" />
    } else if (type.startsWith('audio/')) {
      return <Music className="w-4 h-4" />
    } else if (type.includes('pdf') || type.includes('text')) {
      return <FileText className="w-4 h-4" />
    } else if (type.includes('zip') || type.includes('rar')) {
      return <Archive className="w-4 h-4" />
    }
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let i = 0
    
    while (size >= 1024 && i < sizes.length - 1) {
      size /= 1024
      i++
    }
    
    return `${Math.round(size * 100) / 100} ${sizes[i]}`
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxBytes = maxSize * 1024 * 1024
    if (file.size > maxBytes) {
      return `Le fichier "${file.name}" est trop volumineux. Taille maximale : ${maxSize}MB`
    }

    // Check total files limit
    if (files.length >= maxFiles) {
      return `Nombre maximum de fichiers atteint : ${maxFiles}`
    }

    return null
  }

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return

    const newFiles: File[] = []
    const errors: string[] = []

    Array.from(selectedFiles).forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(error)
      } else {
        newFiles.push(file)
      }
    })

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // Reset input to allow selecting same file again
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  return (
    <div>
      {/* File Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload Button */}
      <button
        type="button"
        onClick={() => !disabled && fileInputRef.current?.click()}
        disabled={disabled}
        className="p-3 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all duration-200 cursor-pointer group border border-slate-200 hover:border-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Joindre des fichiers"
      >
        <Paperclip className={`w-5 h-5 transition-transform ${!disabled ? 'group-hover:rotate-12' : ''}`} />
      </button>

      {/* File Preview Area */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Paperclip className="w-4 h-4" />
            Fichiers joints ({files.length})
          </div>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onFileRemove(index)}
                  disabled={disabled}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Supprimer ce fichier"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag and Drop Zone (only visible when dragging) */}
      {dragOver && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="fixed inset-0 bg-cyan-500/20 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-dashed border-cyan-500">
            <div className="text-center">
              <Paperclip className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900">Déposez vos fichiers ici</p>
              <p className="text-sm text-slate-600 mt-1">Maximum {maxSize}MB par fichier</p>
            </div>
          </div>
        </div>
      )}

      {/* Global drag overlay */}
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        className="fixed inset-0 pointer-events-none"
      />
    </div>
  )
}

export default ChatFileUpload
