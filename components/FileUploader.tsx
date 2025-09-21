'use client'

import React, { useRef, useState } from 'react'
import { Upload, X, File, Image, FileText, Archive } from 'lucide-react'

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
  accept?: string
  maxSize?: number // in MB
  className?: string
}

export default function FileUploader({
  onFileSelect,
  selectedFile,
  accept = ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar",
  maxSize = 10, // 10MB
  className = ''
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const getIcon = (file: File) => {
    const type = file.type
    if (type.startsWith('image/')) {
      return <Image className="w-4 h-4" />
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
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip', 'application/x-rar-compressed'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return 'File type not allowed'
    }

    return null
  }

  const handleFileSelect = (file: File) => {
    const error = validateFile(file)
    if (error) {
      alert(error)
      return
    }
    onFileSelect(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeFile = () => {
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Images, PDFs, documents, archives (max {maxSize}MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
          {getIcon(selectedFile)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={removeFile}
            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
