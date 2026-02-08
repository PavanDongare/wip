'use client'

import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Calendar, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { cn, formatDateRange } from '@/lib/utils'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

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
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Quick filter dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {activeFilter !== 'all' && activeFilter !== 'custom' ? (
              <span className="capitalize">{activeFilter.replace(/([A-Z])/g, ' $1').trim()}</span>
            ) : (
              'Filter'
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleQuickFilter('today')}>
            Today
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickFilter('yesterday')}>
            Yesterday
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickFilter('thisWeek')}>
            This Week
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickFilter('thisMonth')}>
            This Month
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickFilter('thisYear')}>
            This Year
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickFilter('all')}>
            All Time
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom date picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn(hasFilter && 'bg-accent')}>
            <Calendar className="h-4 w-4 mr-2" />
            {hasFilter ? formatDateRange(dateRange) : 'Custom'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="range"
            selected={dateRange}
            onSelect={handleCustomDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Clear filter */}
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={clearFilter}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
