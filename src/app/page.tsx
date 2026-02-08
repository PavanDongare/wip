'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, ArrowDown, Filter, ChevronDown } from 'lucide-react'
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

  // Fetch items - newest first from API, but we'll display with newest at bottom
  const fetchItems = useCallback(async (reset = true, loadOlder = false) => {
    try {
      if (reset) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      // For chat view, we fetch from newest to oldest
      // offset is how many items we've already loaded
      const offset = reset ? 0 : items.length
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
  }, [filterStartDate, filterEndDate, items.length])

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

          fetchItems(false, true).then(() => {
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
        key = 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday'
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
    if (a === 'Today') return 1
    if (b === 'Today') return -1
    if (a === 'Yesterday') return 1
    if (b === 'Yesterday') return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with filters - fixed at top */}
      <header className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg sm:text-xl font-semibold">WIP - Work In Progress 🚧</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-accent')}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
              <ChevronDown className={cn('h-4 w-4 ml-1 transition-transform', showFilters && 'rotate-180')} />
            </Button>
          </div>
          {showFilters && (
            <DateFilter onFilterChange={handleFilterChange} />
          )}
        </div>
      </header>

      {/* Scrollable content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4">
          {/* Top observer for infinite scroll */}
          <div ref={topObserverTarget} className="h-1" />

          {/* Loading more indicator at top */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Initial loading state */}
          {isLoading ? (
            <div className="space-y-4 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-lg border p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No items yet. What did you get done?</p>
            </div>
          ) : (
            <>
              {/* Grouped items - oldest to newest */}
              {dateLabels.map(dateLabel => (
                <div key={dateLabel} className="mb-6">
                  <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 px-1">
                    {dateLabel}
                  </h2>
                  <div className="space-y-2 sm:space-y-3">
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
                <p className="text-center text-xs text-muted-foreground py-4">
                  Beginning of your done items
                </p>
              )}
            </>
          )}

          {/* Bottom ref for scrolling */}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Fixed bottom input */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="fixed bottom-24 right-4 sm:right-8 h-10 w-10 rounded-full shadow-lg z-20"
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
