'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface FilePreview {
  file: File
  preview: string
  id: string
}

interface ChatInputProps {
  onSend: (content: string, files: File[]) => Promise<void>
  disabled?: boolean
  className?: string
}

export function ChatInput({ onSend, disabled = false, className }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

  const handleSend = async () => {
    if (!hasContent || isSending) return

    setIsSending(true)
    const files = filePreviews.map(fp => fp.file)

    try {
      await onSend(content, files)
      // Clear input after successful send
      setContent('')
      // Clean up previews
      filePreviews.forEach(fp => URL.revokeObjectURL(fp.preview))
      setFilePreviews([])
      // Focus textarea
      setTimeout(() => textareaRef.current?.focus(), 100)
    } catch (error) {
      console.error('Failed to send:', error)
      alert('Failed to send. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (unless Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('border-b bg-card', className)}>
      <div className="max-w-3xl mx-auto p-4 space-y-3">
        {/* File previews */}
        {filePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filePreviews.map(fp => (
              <div key={fp.id} className="relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted border">
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
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled || isSending}
          />

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What did you get done?"
            disabled={disabled || isSending}
            rows={1}
            className="min-h-[44px] max-h-[200px] resize-none"
          />

          {/* Send button */}
          <Button
            type="button"
            size="icon"
            className={cn(
              'h-10 w-10 shrink-0 transition-all',
              hasContent ? 'opacity-100' : 'opacity-50 pointer-events-none'
            )}
            onClick={handleSend}
            disabled={disabled || isSending}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line • Max 50MB per file
        </p>
      </div>
    </div>
  )
}
