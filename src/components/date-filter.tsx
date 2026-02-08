'use client'

import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

interface DateFilterProps {
  onFilterChange: (startDate: string | undefined, endDate: string | undefined) => void
  className?: string
}

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'all' | 'custom'

export function DateFilter({ onFilterChange, className }: DateFilterProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all')

  const handleQuickFilter = (filter: QuickFilter) => {
    setActiveFilter(filter)
    const now = new Date()

    switch (filter) {
      case 'today':
        onFilterChange(startOfDay(now).toISOString(), endOfDay(now).toISOString())
        setDateRange({ from: now, to: now })
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        onFilterChange(startOfDay(yesterday).toISOString(), endOfDay(yesterday).toISOString())
        setDateRange({ from: yesterday, to: yesterday })
        break
      case 'thisWeek':
        onFilterChange(startOfWeek(now).toISOString(), endOfWeek(now).toISOString())
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) })
        break
      case 'thisMonth':
        onFilterChange(startOfMonth(now).toISOString(), endOfMonth(now).toISOString())
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) })
        break
      case 'thisYear':
        onFilterChange(startOfYear(now).toISOString(), endOfYear(now).toISOString())
        setDateRange({ from: startOfYear(now), to: endOfYear(now) })
        break
      case 'all':
        onFilterChange(undefined, undefined)
        setDateRange(undefined)
        break
    }
  }

  const handleCustomDate = (range: DateRange | undefined) => {
    setDateRange(range)
    setActiveFilter('custom')

    if (range?.from) {
      const startDate = startOfDay(range.from).toISOString()
      const endDate = range.to ? endOfDay(range.to).toISOString() : endOfDay(range.from).toISOString()
      onFilterChange(startDate, endDate)
    } else {
      onFilterChange(undefined, undefined)
    }
  }

  const clearFilter = () => {
    handleQuickFilter('all')
    setActiveFilter('all')
  }

  const hasFilter = dateRange?.from

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Quick filters - minimal text links */}
      <button
        onClick={() => handleQuickFilter('today')}
        className={cn(
          "text-xs px-2 py-1 rounded transition-colors",
          activeFilter === 'today' ? "bg-yellow-200 text-yellow-800" : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
        )}
      >
        Today
      </button>
      <button
        onClick={() => handleQuickFilter('thisWeek')}
        className={cn(
          "text-xs px-2 py-1 rounded transition-colors",
          activeFilter === 'thisWeek' ? "bg-yellow-200 text-yellow-800" : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
        )}
      >
        Week
      </button>
      <button
        onClick={() => handleQuickFilter('thisMonth')}
        className={cn(
          "text-xs px-2 py-1 rounded transition-colors",
          activeFilter === 'thisMonth' ? "bg-yellow-200 text-yellow-800" : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
        )}
      >
        Month
      </button>
      <button
        onClick={() => handleQuickFilter('all')}
        className={cn(
          "text-xs px-2 py-1 rounded transition-colors",
          activeFilter === 'all' ? "bg-yellow-200 text-yellow-800" : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
        )}
      >
        All
      </button>

      {/* Custom date picker - minimal */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors",
              hasFilter || activeFilter === 'custom' ? "bg-yellow-200 text-yellow-800" : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
            )}
          >
            <Calendar className="h-3 w-3" />
            {hasFilter ? `${dateRange.from?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Range'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-stone-200" align="start">
          <CalendarComponent
            mode="range"
            selected={dateRange}
            onSelect={handleCustomDate}
            numberOfMonths={1}
            className="border-stone-200"
          />
        </PopoverContent>
      </Popover>

      {/* Clear filter */}
      {hasFilter && (
        <button
          onClick={clearFilter}
          className="text-xs text-stone-400 hover:text-stone-600 px-1 py-1"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
