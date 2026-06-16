'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Loader2, Paperclip } from 'lucide-react'
import { FloatingComposer } from '@/components/floating-composer'
import { DoneItemCard } from '@/components/done-item-card'
import { DateFilter } from '@/components/date-filter'
import { Skeleton } from '@/components/ui/skeleton'
import type { DoneItem } from '@/lib/supabase/types'
import { toast } from 'sonner'

interface DoneItemsResponse {
  items: DoneItem[]
  hasMore: boolean
}

export default function HomePage() {
  const [items, setItems] = useState<DoneItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filterStartDate, setFilterStartDate] = useState<string>()
  const [filterEndDate, setFilterEndDate] = useState<string>()

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const topObserverTarget = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const itemsLengthRef = useRef(0)
  const isInitialMount = useRef(true)
  const deleteAbortControllersRef = useRef<Record<string, AbortController>>({})
  const deletedItemsCacheRef = useRef<Record<string, DoneItem>>({})
  const isFetchingMoreRef = useRef(false)

  // Cleanup pending abort controllers on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const controllers = deleteAbortControllersRef.current
      Object.values(controllers).forEach(c => c.abort())
    }
  }, [])

  // Update items length ref when items change
  useEffect(() => {
    itemsLengthRef.current = items.length
  }, [items])

  // Fetch items - newest first from API, but we'll display with newest at bottom
  const fetchItems = useCallback(async (reset = true) => {
    if (reset) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const offset = reset ? 0 : itemsLengthRef.current
      const params = new URLSearchParams({
        limit: '15',
        offset: offset.toString()
      })

      if (filterStartDate) params.set('startDate', filterStartDate)
      if (filterEndDate) params.set('endDate', filterEndDate)

      const response = await fetch(`/api/done-items?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')

      const data: DoneItemsResponse = await response.json()
      const reversedItems = [...data.items].reverse()

      if (reset) {
        setItems(reversedItems)
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'instant' })
          // Allow observer to work after initial load and scroll
          setTimeout(() => {
            isInitialMount.current = false
          }, 500)
        }, 100)
      } else {
        setItems(prev => [...reversedItems, ...prev])
      }

      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [filterStartDate, filterEndDate])

  // Initial fetch
  useEffect(() => {
    isInitialMount.current = true
    fetchItems(true)
  }, [filterStartDate, filterEndDate, fetchItems])

  // Load more when scrolling to top
  useEffect(() => {
    if (isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (
          target.isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingMore &&
          !isInitialMount.current &&
          !isFetchingMoreRef.current
        ) {
          isFetchingMoreRef.current = true
          const container = containerRef.current
          const oldHeight = container?.scrollHeight || 0

          fetchItems(false).then(() => {
            setTimeout(() => {
              if (container) {
                const newHeight = container.scrollHeight
                container.scrollTop = container.scrollTop + (newHeight - oldHeight)
              }
              isFetchingMoreRef.current = false
            }, 50)
          }).catch(() => {
            isFetchingMoreRef.current = false
          })
        }
      },
      { threshold: 0.1, root: containerRef.current }
    )

    const currentTarget = topObserverTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoading, isLoadingMore, fetchItems])

  // Handle send - optimistic: show immediately, remove on failure
  const handleSend = useCallback((content: string, files: File[], previewUrls: string[]) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const optimisticItem: DoneItem = {
      id: tempId,
      content: content.trim() || null,
      media_urls: previewUrls.length > 0 ? previewUrls : null,
      created_at: new Date().toISOString(),
    }

    setItems(prev => [...prev, optimisticItem])

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)

    // Background sync
    ;(async () => {
      try {
        let mediaUrls: string[] = []

        if (files.length > 0) {
          const formData = new FormData()
          files.forEach(file => formData.append('files', file))
          const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData })
          if (!uploadResponse.ok) throw new Error('Upload failed')
          const uploadData = await uploadResponse.json()
          mediaUrls = uploadData.files.map((f: { url: string }) => f.url)
        }

        const response = await fetch('/api/done-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() || null, mediaUrls })
        })
        if (!response.ok) throw new Error('Create failed')

        const newItem: DoneItem = await response.json()
        setItems(prev => prev.map(item => item.id === tempId ? newItem : item))
      } catch (error) {
        console.error('Failed to sync item:', error)
        setItems(prev => prev.filter(item => item.id !== tempId))
      } finally {
        // Cleanup blob URLs
        previewUrls.forEach(url => URL.revokeObjectURL(url))
      }
    })()
  }, [])

  // Handle delete - optimistic with concurrent API call & undo support
  const handleDelete = useCallback((id: string) => {
    let deletedItem: DoneItem | undefined
    
    setItems(prev => {
      deletedItem = prev.find(item => item.id === id)
      if (deletedItem) {
        deletedItemsCacheRef.current[id] = deletedItem
      }
      return prev.filter(item => item.id !== id)
    })

    // Cancel any active delete request for this item first if it exists
    if (deleteAbortControllersRef.current[id]) {
      deleteAbortControllersRef.current[id].abort()
    }

    const controller = new AbortController()
    deleteAbortControllersRef.current[id] = controller

    let deleteRequestCompleted = false
    let deleteRequestSucceeded = false

    // Fire the DELETE API request immediately
    fetch(`/api/done-items/${id}`, {
      method: 'DELETE',
      signal: controller.signal
    })
    .then(async (response) => {
      deleteRequestCompleted = true
      if (!response.ok) throw new Error('Failed to delete')
      deleteRequestSucceeded = true
      delete deleteAbortControllersRef.current[id]
    })
    .catch((error) => {
      deleteRequestCompleted = true
      if (error.name === 'AbortError') return // User cancelled it via Undo

      console.error('Failed to sync deletion:', error)
      delete deleteAbortControllersRef.current[id]
      
      // If the delete request failed and the user hasn't clicked Undo, restore the item
      const restored = deletedItemsCacheRef.current[id]
      if (restored) {
        setItems(prev => {
          if (prev.some(item => item.id === id)) return prev
          return [...prev, restored].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
        delete deletedItemsCacheRef.current[id]
        toast.error("Failed to delete item")
      }
    })

    // Show undo toast notification
    toast("Item deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          // 1. Abort the in-flight delete request if it is still running
          const activeController = deleteAbortControllersRef.current[id]
          if (activeController) {
            activeController.abort()
            delete deleteAbortControllersRef.current[id]
          }

          // 2. Restore in state immediately
          const restoredItem = deletedItemsCacheRef.current[id]
          if (restoredItem) {
            setItems(prev => {
              if (prev.some(item => item.id === id)) return prev
              return [...prev, restoredItem].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            })
          }

          // 3. If the delete request had already completed successfully, we POST the item back to recreate it
          if (deleteRequestCompleted && deleteRequestSucceeded && restoredItem) {
            try {
              const response = await fetch('/api/done-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: restoredItem.content,
                  mediaUrls: restoredItem.media_urls || []
                })
              })

              if (!response.ok) throw new Error('Failed to restore')
              
              const newItem: DoneItem = await response.json()
              // Update state with the newly created database item ID
              setItems(prev => prev.map(item => item.id === id ? newItem : item))
              toast.success("Item restored")
            } catch (err) {
              console.error('Failed to restore item in database:', err)
              toast.error("Failed to restore item on server")
              // Since restoration on the server failed, remove the item from state
              setItems(prev => prev.filter(item => item.id !== id))
            }
          } else {
            toast.success("Item restored")
          }

          // Clean up cache
          delete deletedItemsCacheRef.current[id]
        }
      },
      duration: 5000,
    })
  }, [])

  // Handle update - optimistic
  const handleUpdate = useCallback(async (id: string, content: string) => {
    let previousItem: DoneItem | undefined
    setItems(prev => {
      previousItem = prev.find(item => item.id === id)
      return prev.map(item =>
        item.id === id ? { ...item, content: content.trim() || null } : item
      )
    })

    try {
      const response = await fetch(`/api/done-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() || null })
      })
      if (!response.ok) throw new Error('Failed to update')
      const updated: DoneItem = await response.json()
      setItems(prev => prev.map(item => item.id === id ? updated : item))
    } catch {
      if (previousItem) {
        setItems(prev => prev.map(item => item.id === id ? previousItem! : item))
      }
    }
  }, [])

  const handleFilterChange = (startDate: string | undefined, endDate: string | undefined) => {
    setFilterStartDate(startDate)
    setFilterEndDate(endDate)
  }

  // Group items by date - memoized
  const groupedItems = useMemo(() => {
    const groups: Record<string, DoneItem[]> = {}

    for (const item of items) {
      const date = new Date(item.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let key: string
      if (date.toDateString() === today.toDateString()) {
        key = 'Today \u{1F6A7}'
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday \u{1F4CB}'
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }

    return groups
  }, [items])

  const dateLabels = useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => {
      if (a.includes('Today')) return 1
      if (b.includes('Today')) return -1
      if (a.includes('Yesterday')) return 1
      if (b.includes('Yesterday')) return -1
      return new Date(a).getTime() - new Date(b).getTime()
    })
  }, [groupedItems])

  return (
    <div className="flex flex-col h-[100dvh] bg-stone-50">
      {/* Header with filters - fixed at top */}
      <header className="flex-shrink-0 border-b-2 border-yellow-400 bg-yellow-300 backdrop-blur supports-[backdrop-filter]:bg-yellow-300/95">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                WIP <span className="text-2xl">{'\u{1F6A7}'}</span>
              </h1>
              <div className="hidden sm:flex items-center gap-1">
                <DateFilter onFilterChange={handleFilterChange} />
              </div>
            </div>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden text-stone-400 hover:text-stone-600 px-2 py-1"
            >
              {showFilters ? '\u2715' : '\u2699\uFE0F'}
            </button>
          </div>
          {/* Mobile filters */}
          {showFilters && (
            <div className="sm:hidden mt-2 pb-2 animate-in slide-in-from-top-2">
              <DateFilter onFilterChange={handleFilterChange} />
            </div>
          )}
        </div>
      </header>

      {/* Scrollable content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
          {/* Top observer for infinite scroll */}
          <div ref={topObserverTarget} className="h-1" />

          {/* Loading more indicator at top */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
            </div>
          )}

          {/* Initial loading state */}
          {isLoading ? (
            <div className="space-y-4 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg border border-stone-200 p-4 space-y-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-5 w-5 rounded-full bg-stone-200" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full bg-stone-200" />
                      <Skeleton className="h-4 w-2/3 bg-stone-200" />
                    </div>
                  </div>
                  <Skeleton className="h-40 w-full rounded-lg bg-stone-200" />
                  <Skeleton className="h-3 w-20 bg-stone-200" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">{'\u{1F4CE}'}</div>
              <h2 className="text-xl font-semibold text-stone-700 mb-2">Let&apos;s get to work</h2>
              <p className="text-stone-500">Add your first WIP item below!</p>
            </div>
          ) : (
            <>
              {/* Grouped items - oldest to newest */}
              {dateLabels.map(dateLabel => (
                <div key={dateLabel} className="mb-6">
                  <h2 className="text-xs font-semibold text-stone-400 mb-3 px-1 uppercase tracking-wider flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {dateLabel}
                  </h2>
                  <div className="space-y-3">
                    {groupedItems[dateLabel].map(item => (
                      <DoneItemCard
                        key={item.id}
                        item={item}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </div>
                </div>
              ))}

            </>
          )}

          {/* Bottom ref for scrolling */}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Floating Action Button composer */}
      <FloatingComposer onSend={handleSend} disabled={isLoading} />
    </div>
  )
}
