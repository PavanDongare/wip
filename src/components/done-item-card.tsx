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
      <div className={cn('bg-card rounded-lg border p-4 space-y-3', className)}>
        {/* Header with tick and menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Green tick - display only */}
            <span className="text-green-500 text-xl shrink-0">✅</span>
            {item.content && (
              <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDeleting(true)} className="text-destructive">
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

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground">
          {timeAgo}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="What did you get done?"
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditing(false)
              setEditContent(item.content || '')
            }}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
