'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, ArrowDown, Filter, ChevronDown, Paperclip } from 'lucide-react'
import { ChatInput } from '@/components/chat-input'
import { DoneItemCard } from '@/components/done-item-card'
import { DateFilter } from '@/components/date-filter'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DoneItem } from '@/lib/supabase/types'

interface DoneItemsResponse {
  items: DoneItem[]
  hasMore: boolean
}

export default function HomePage() {
  const [items, setItems] = useState<DoneItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterStartDate, setFilterStartDate] = useState<string>()
  const [filterEndDate, setFilterEndDate] = useState<string>()

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const topObserverTarget = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const itemsLengthRef = useRef(0)

  // Update items length ref when items change
  useEffect(() => {
    itemsLengthRef.current = items.length
  }, [items])

  // Fetch items - newest first from API, but we'll display with newest at bottom
  const fetchItems = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      // For chat view, we fetch from newest to oldest
      // offset is how many items we've already loaded
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

      // Items come sorted newest first from API
      // We reverse them so oldest is first (at top of list)
      const reversedItems = [...data.items].reverse()

      if (reset) {
        setItems(reversedItems)
        // Scroll to bottom after initial load
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'instant' })
        }, 100)
      } else {
        // Prepend older items to the top (before the current items)
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
    fetchItems(true)
  }, [filterStartDate, filterEndDate])

  // Scroll to bottom observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Show scroll button if we're more than 100px from bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollToBottom(!isNearBottom)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Load more when scrolling to top
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          // Save current scroll position to maintain it after loading
          const container = containerRef.current
          const oldHeight = container?.scrollHeight || 0

          fetchItems(false).then(() => {
            // Restore relative scroll position
            setTimeout(() => {
              if (container) {
                const newHeight = container.scrollHeight
                container.scrollTop = container.scrollTop + (newHeight - oldHeight)
              }
            }, 50)
          })
        }
      },
      { threshold: 0.1 }
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

  // Scroll to bottom
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle send
  const handleSend = async (content: string, files: File[]) => {
    let mediaUrls: string[] = []

    // Upload files first
    if (files.length > 0) {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files')
      }

      const uploadData = await uploadResponse.json()
      mediaUrls = uploadData.files.map((f: { url: string }) => f.url)
    }

    // Create item
    const response = await fetch('/api/done-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content.trim() || null,
        mediaUrls
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create item')
    }

    const newItem: DoneItem = await response.json()

    // Add to end of list (newest at bottom)
    setItems(prev => [...prev, newItem])

    // Scroll to bottom to show new item
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/done-items/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to delete item')
    }

    setItems(prev => prev.filter(item => item.id !== id))
  }

  // Handle update
  const handleUpdate = async (id: string, content: string) => {
    const response = await fetch(`/api/done-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() || null })
    })

    if (!response.ok) {
      throw new Error('Failed to update item')
    }

    const updated: DoneItem = await response.json()
    setItems(prev => prev.map(item => item.id === id ? updated : item))
  }

  // Handle filter change
  const handleFilterChange = (startDate: string | undefined, endDate: string | undefined) => {
    setFilterStartDate(startDate)
    setFilterEndDate(endDate)
  }

  // Group items by date - now with oldest first within each group
  const groupedItems = (() => {
    const groups: Record<string, DoneItem[]> = {}

    for (const item of items) {
      const date = new Date(item.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let key: string
      if (date.toDateString() === today.toDateString()) {
        key = 'Today 🚧'
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday 📋'
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }

    return groups
  })()

  // Sort date labels - oldest first
  const dateLabels = Object.keys(groupedItems).sort((a, b) => {
    if (a.includes('Today')) return 1
    if (b.includes('Today')) return -1
    if (a.includes('Yesterday')) return 1
    if (b.includes('Yesterday')) return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Header with filters - fixed at top */}
      <header className="flex-shrink-0 border-b-2 border-yellow-400 bg-yellow-50/80 backdrop-blur supports-[backdrop-filter]:bg-yellow-50/60">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                WIP <span className="text-3xl">🚧</span>
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">What did you ship today?</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "border-stone-300 text-stone-600 hover:bg-stone-100",
                showFilters && "bg-stone-200"
              )}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
              <ChevronDown className={cn('h-4 w-4 ml-1 transition-transform', showFilters && 'rotate-180')} />
            </Button>
          </div>
          {showFilters && (
            <div className="mt-3 animate-in slide-in-from-top-2">
              <DateFilter onFilterChange={handleFilterChange} />
            </div>
          )}
        </div>
      </header>

      {/* Scrollable content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
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
              <div className="text-6xl mb-4">📎</div>
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

              {/* End of list indicator */}
              {!hasMore && items.length > 0 && (
                <div className="text-center py-6 border-t border-dashed border-stone-300">
                  <p className="text-xs text-stone-400">📍 Beginning of your work</p>
                </div>
              )}
            </>
          )}

          {/* Bottom ref for scrolling */}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Fixed bottom input */}
      <div className="flex-shrink-0 border-t-2 border-yellow-400 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="fixed bottom-24 right-4 sm:right-6 h-10 w-10 rounded-full bg-yellow-400 hover:bg-yellow-500 text-stone-800 shadow-lg border-2 border-stone-300 z-20"
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
