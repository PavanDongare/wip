'use client'

import { useState, memo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
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

  const handleEdit = async () => {
    if (onUpdate) {
      await onUpdate(item.id, editContent)
      setIsEditing(false)
    }
  }

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
  const createdAt = new Date(item.created_at)
  const photoDay = format(createdAt, 'd MMM').toUpperCase()
  const photoYear = format(createdAt, 'yyyy')
  const hasMedia = item.media_urls && item.media_urls.length > 0
  const multiMedia = item.media_urls && item.media_urls.length > 1

  return (
    <>
      <div className={cn(
        hasMedia
          ? multiMedia
            ? 'bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-yellow-300/50 transition-all overflow-hidden'
            : 'bg-white rounded-2xl border-4 border-stone-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all overflow-hidden relative'
          : 'bg-stone-50/50 border border-stone-200/50 rounded-xl shadow-none hover:border-stone-300 transition-all w-fit max-w-[85%] sm:max-w-[70%]',
        hasMedia && !multiMedia ? 'p-0' : 'p-3',
        className
      )}>
        {multiMedia ? (
          /* Multiple images: title on top, scrollable strip below */
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="text-xl shrink-0 mt-0.5">✅</span>
                {item.content && (
                  <p className="text-base md:text-lg font-extrabold tracking-tight text-stone-900 leading-snug whitespace-pre-wrap break-words">{item.content}</p>
                )}
              </div>
              <ItemMenu onEdit={() => setIsEditing(true)} onDelete={() => onDelete?.(item.id)} />
            </div>
            <MediaGrid mediaUrls={item.media_urls!} className="mt-2" />
            <div className="text-xs text-stone-400 flex items-center gap-1 mt-1">
              📎 {timeAgo}
            </div>
          </>
        ) : hasMedia ? (
          /* Single image: Quirky Neo-Brutalist Poster Card */
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] min-h-[300px] sm:min-h-[400px] flex flex-col justify-end p-6">
            {/* The Image (Background on both mobile & desktop) */}
            <MediaGrid
              mediaUrls={item.media_urls!}
              className="absolute inset-0 w-full h-full rounded-none"
              capturedAt={item.created_at}
            />

            {/* Dark gradient scrim (always active to ensure yellow/white text stands out on any image) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />

            <div className="absolute top-4 left-4 z-20 min-w-20 rotate-[-3deg] border-4 border-stone-900 bg-yellow-300 px-3 py-2 text-stone-900 shadow-[5px_5px_0px_rgba(0,0,0,1)]">
              <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-stone-900 bg-stone-900 shadow-[1px_1px_0px_rgba(0,0,0,0.4)]" />
              <div className="font-mono text-[10px] font-black uppercase leading-none tracking-widest">
                {photoDay}
              </div>
              <div className="mt-1 font-mono text-[18px] font-black leading-none tracking-tight">
                {photoYear}
              </div>
            </div>

            {/* Actions Menu (Top-right corner, styled as a brutalist button badge) */}
            <div className="absolute top-4 right-4 z-20 bg-white border-2 border-stone-900 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all">
              <ItemMenu 
                onEdit={() => setIsEditing(true)} 
                onDelete={() => onDelete?.(item.id)}
                className="text-stone-900 hover:bg-stone-100 h-9 w-9 rounded-none animate-in fade-in zoom-in-50 duration-200"
              />
            </div>

            {/* Content area at the bottom */}
            <div className="relative z-10 w-full">
              {item.content && (
                <p className="indie-poster-caption whitespace-pre-wrap break-words leading-none">
                  {item.content}
                </p>
              )}
              <div className="mt-3 inline-flex rotate-[-1.5deg] items-center gap-2 border-2 border-stone-900 bg-yellow-300 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-stone-900 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <span className="text-sm leading-none" aria-hidden>
                  ✓
                </span>
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Vertical layout for text-only (subtle & compact) */
          <>
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                <span className="text-xs shrink-0 mt-0.5 text-stone-400">✓</span>
                {item.content && (
                  <p className="text-xs md:text-sm font-medium whitespace-pre-wrap break-words text-stone-600 leading-normal">{item.content}</p>
                )}
              </div>
              <ItemMenu onEdit={() => setIsEditing(true)} onDelete={() => onDelete?.(item.id)} className="h-6 w-6 text-stone-400 hover:bg-stone-100" />
            </div>
            <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-1">
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


    </>
  )
})

function ItemMenu({ onEdit, onDelete, className }: { onEdit: () => void; onDelete: () => void; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8 shrink-0 hover:bg-stone-100 text-stone-400", className)}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-2 border-stone-900 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] p-0 min-w-[130px] bg-white"
      >
        <DropdownMenuItem
          onClick={onEdit}
          className="rounded-none font-mono font-bold text-xs uppercase tracking-wider text-stone-800 focus:bg-yellow-300 focus:text-stone-900 px-3 py-2.5 cursor-pointer border-b border-stone-900"
        >
          ✏️ Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="rounded-none font-mono font-bold text-xs uppercase tracking-wider text-red-600 focus:bg-red-500 focus:text-white px-3 py-2.5 cursor-pointer"
        >
          🗑 Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
