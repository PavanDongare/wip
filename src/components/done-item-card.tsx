'use client'

import { useState, memo } from 'react'
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

export const DoneItemCard = memo(function DoneItemCard({ item, onDelete, onUpdate, className }: DoneItemCardProps) {
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
  const hasMedia = item.media_urls && item.media_urls.length > 0
  const multiMedia = item.media_urls && item.media_urls.length > 1

  return (
    <>
      <div className={cn(
        'bg-white rounded-2xl border border-stone-200 p-4 shadow-sm hover:shadow-md hover:border-yellow-300/50 transition-all',
        className
      )}>
        {multiMedia ? (
          /* Multiple images: title on top, scrollable strip below */
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="text-lg shrink-0">✅</span>
                {item.content && (
                  <p className="text-sm whitespace-pre-wrap break-words text-stone-700 leading-relaxed">{item.content}</p>
                )}
              </div>
              <ItemMenu onEdit={() => setIsEditing(true)} onDelete={() => setIsDeleting(true)} />
            </div>
            <MediaGrid mediaUrls={item.media_urls!} />
            <div className="text-xs text-stone-400 flex items-center gap-1 mt-1">
              📎 {timeAgo}
            </div>
          </>
        ) : hasMedia ? (
          /* Single image: image left, content + timestamp right */
          <>
            <div className="flex gap-3">
              <MediaGrid mediaUrls={item.media_urls!} />
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                    <span className="text-lg shrink-0 leading-none mt-0.5">✅</span>
                    {item.content && (
                      <p className="text-sm whitespace-pre-wrap break-words text-stone-700 leading-relaxed">{item.content}</p>
                    )}
                  </div>
                  <ItemMenu onEdit={() => setIsEditing(true)} onDelete={() => setIsDeleting(true)} />
                </div>
                <div className="text-xs text-stone-400 flex items-center gap-1">
                  📎 {timeAgo}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Vertical layout for text-only */
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="text-lg shrink-0">✅</span>
                {item.content && (
                  <p className="text-sm whitespace-pre-wrap break-words text-stone-700 leading-relaxed">{item.content}</p>
                )}
              </div>
              <ItemMenu onEdit={() => setIsEditing(true)} onDelete={() => setIsDeleting(true)} />
            </div>
            <div className="text-xs text-stone-400 flex items-center gap-1 mt-2">
              📎 {timeAgo}
            </div>
          </>
        )}
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
})

function ItemMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-stone-100 text-stone-400">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-stone-200">
        <DropdownMenuItem onClick={onEdit} className="text-stone-600 focus:text-stone-700 focus:bg-stone-50">
          <Edit2 className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-red-500 focus:text-red-600 focus:bg-red-50">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
