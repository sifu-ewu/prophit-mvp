import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`
  } else {
    return formatDate(d)
  }
}

export function getMovementColor(changePercent: number): string {
  if (changePercent > 0) {
    return 'text-green-500'
  } else if (changePercent < 0) {
    return 'text-red-500'
  }
  return 'text-gray-500'
}

export function getMovementBgColor(changePercent: number): string {
  if (changePercent > 0) {
    return 'bg-green-500/10'
  } else if (changePercent < 0) {
    return 'bg-red-500/10'
  }
  return 'bg-gray-500/10'
}

export function getSignificanceBadgeColor(significance: string): string {
  switch (significance) {
    case 'major':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'moderate':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'minor':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
