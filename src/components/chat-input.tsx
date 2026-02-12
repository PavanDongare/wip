'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface FilePreview {
  file: File
  preview: string
  id: string
}

interface ChatInputProps {
  onSend: (content: string, files: File[], previewUrls: string[]) => void
  disabled?: boolean
  className?: string
}

export function ChatInput({ onSend, disabled = false, className }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [content])

  const hasContent = content.trim().length > 0 || filePreviews.length > 0

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newPreviews: FilePreview[] = []

    for (const file of files) {
      // Validate file type (images and videos only)
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
      const isValidType = [...validImageTypes, ...validVideoTypes].includes(file.type)

      if (!isValidType) {
        alert(`${file.name} is not a valid image or video file`)
        continue
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        alert(`${file.name} exceeds the 50MB size limit`)
        continue
      }

      // Create preview URL
      const preview = URL.createObjectURL(file)
      newPreviews.push({
        file,
        preview,
        id: `${file.name}-${Date.now()}-${Math.random()}`
      })
    }

    setFilePreviews(prev => [...prev, ...newPreviews])

    // Reset input
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const removeFile = (id: string) => {
    setFilePreviews(prev => {
      const updated = prev.filter(fp => fp.id !== id)
      // Revoke URL to free memory
      const removed = prev.find(fp => fp.id === id)
      if (removed) {
        URL.revokeObjectURL(removed.preview)
      }
      return updated
    })
  }

  const handleSend = () => {
    if (!hasContent || disabled) return

    const currentContent = content
    const currentFiles = filePreviews.map(fp => fp.file)
    const currentPreviewUrls = filePreviews.map(fp => fp.preview)

    // Clear input immediately - optimistic
    setContent('')
    setFilePreviews([]) // Don't revoke URLs - parent manages blob URL lifecycle

    // Fire and forget - parent handles optimistic UI + background sync
    onSend(currentContent, currentFiles, currentPreviewUrls)

    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (unless Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('border-b border-stone-200 bg-white', className)}>
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {/* File previews */}
        {filePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filePreviews.map(fp => (
              <div key={fp.id} className="relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                  {fp.file.type.startsWith('video/') ? (
                    <video
                      src={fp.preview}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fp.preview}
                      alt={fp.file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600"
                  onClick={() => removeFile(fp.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* Text input */}
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What did you get done? 🚧"
            disabled={disabled}
            rows={1}
            className="min-h-[44px] max-h-[200px] resize-none border-stone-300 focus:border-yellow-400 focus:ring-yellow-400 bg-stone-50/50"
          />

          {/* Camera button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            title="Add photo"
          >
            <Camera className="h-5 w-5" />
          </Button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />

          {/* Send button */}
          <Button
            type="button"
            size="icon"
            className={cn(
              'h-10 w-10 shrink-0 transition-all',
              hasContent ? 'bg-yellow-400 hover:bg-yellow-500 text-stone-800' : 'opacity-50 pointer-events-none bg-stone-200'
            )}
            onClick={handleSend}
            disabled={disabled}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
