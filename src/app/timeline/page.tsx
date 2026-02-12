'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { DoneItemCard } from '@/components/done-item-card'
import { DateFilter } from '@/components/date-filter'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { DoneItem } from '@/lib/supabase/types'

interface DoneItemsResponse {
  items: DoneItem[]
  hasMore: boolean
}

export default function TimelinePage() {
  const [items, setItems] = useState<DoneItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStartDate, setFilterStartDate] = useState<string>()
  const [filterEndDate, setFilterEndDate] = useState<string>()

  // Fetch items
  const fetchItems = async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams({
        limit: '100' // More items on timeline page
      })

      if (filterStartDate) params.set('startDate', filterStartDate)
      if (filterEndDate) params.set('endDate', filterEndDate)

      const response = await fetch(`/api/done-items?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')

      const data: DoneItemsResponse = await response.json()
      setItems(data.items)
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Refetch when filters change
  useEffect(() => {
    fetchItems()
  }, [filterStartDate, filterEndDate])

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

  // Group items by date
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
        key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }

    return groups
  })()

  const dateLabels = Object.keys(groupedItems).sort((a, b) => {
    // Sort by date (most recent first)
    if (a === 'Today') return -1
    if (b === 'Today') return 1
    if (a === 'Yesterday') return -1
    if (b === 'Yesterday') return 1
    return new Date(b).getTime() - new Date(a).getTime()
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Timeline</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="mb-6">
          <DateFilter onFilterChange={handleFilterChange} />
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
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
            <p className="text-muted-foreground">
              {filterStartDate || filterEndDate
                ? 'No items found for the selected date range.'
                : 'No items yet. Go to the home page to add your first &quot;done&quot;!'}
            </p>
          </div>
        ) : (
          <>
            {/* Grouped items by date */}
            {dateLabels.map(dateLabel => (
              <div key={dateLabel} className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {dateLabel}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({groupedItems[dateLabel].length} {groupedItems[dateLabel].length === 1 ? 'item' : 'items'})
                  </span>
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
      </main>
    </div>
  )
}
