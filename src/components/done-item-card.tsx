'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { MediaGrid } from '@/components/media-grid'
import { cn } from '@/lib/utils'
import type { DoneItem } from '@/lib/supabase/types'

interface DoneItemCardProps {
  item: DoneItem
  onDelete?: (id: string) => void
  onUpdate?: (id: string, content: string) => void
  className?: string
}

export function DoneItemCard({ item, onDelete, onUpdate, className }: DoneItemCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(item.content || '')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = async () => {
    if (onUpdate) {
      await onUpdate(item.id, editContent)
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(item.id)
      setIsDeleting(false)
    }
  }

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true })

  return (
    <>
      <div className={cn(
        'bg-white rounded-lg border border-stone-200 p-4 shadow-sm hover:shadow-md hover:border-yellow-300/50 transition-all',
        className
      )}>
        {/* Header with tick and menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Green checkmark emoji */}
            <span className="text-lg shrink-0">✅</span>
            {item.content && (
              <p className="text-sm whitespace-pre-wrap break-words text-stone-700 leading-relaxed">{item.content}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-stone-100 text-stone-400">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-stone-200">
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-stone-600 focus:text-stone-700 focus:bg-stone-50">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDeleting(true)} className="text-red-500 focus:text-red-600 focus:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Media Grid */}
        {item.media_urls && item.media_urls.length > 0 && (
          <MediaGrid mediaUrls={item.media_urls} />
        )}

        {/* Timestamp with paperclip */}
        <div className="text-xs text-stone-400 flex items-center gap-1">
          📎 {timeAgo}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-stone-800">Edit ✏️</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="What did you get done?"
            rows={4}
            className="resize-none border-stone-300 focus:border-yellow-400 focus:ring-yellow-400"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setEditContent(item.content || '')
              }}
              className="border-stone-300 text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-yellow-400 hover:bg-yellow-500 text-stone-800">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-stone-800">Delete this? 🗑️</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500">
            This can&apos;t be undone. Sure you want to delete?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleting(false)}
              className="border-stone-300 text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
