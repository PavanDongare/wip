import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateRange(range?: { from?: Date; to?: Date }): string {
  if (!range?.from) return 'Pick a date'

  if (range.to) {
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, y')}`
  }

  return format(range.from, 'MMM d, y')
}
