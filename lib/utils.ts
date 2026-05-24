import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind / NativeWind class names safely. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format a like count for display.
 * e.g. 1200 → "1.2K", 1000000 → "1M"
 */
export function formatLikeCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(count)
}

export function capitalizeWords(str: string): string {
  return str
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/** Strip HTML tags for native Text (alias for web `stripTags`). */
export function stripTags(input: string): string {
  if (!input?.trim()) return ''
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Public profile under the tab navigator (UUID or username slug after `/profile/`).
 * e.g. "/(tabs)/profile/550e8400-e29b-..." or "/(tabs)/profile/janedoe"
 */
export function generateProfileUrl(userIdOrUsername: string): string {
  return `/(tabs)/profile/${encodeURIComponent(userIdOrUsername.replace(/^@/, ''))}`
}

/**
 * Generate the public restaurant URL path for a given slug.
 * e.g. "fancy-eats" → "/restaurants/fancy-eats"
 */
export function generateRestaurantUrl(slug: string): string {
  return `/restaurants/${encodeURIComponent(slug)}`
}

/**
 * Truncate text to a maximum length, appending an ellipsis if needed.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

/**
 * Format a date as a relative time string (e.g. "2 hours ago", "3 days ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 5) return `${weeks}w ago`
  if (months < 12) return `${months}mo ago`
  return `${years}y ago`
}

/**
 * Returns the Nhost Storage public URL for a given file ID.
 */
export function nhostFileUrl(fileId: string): string {
  const subdomain = process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN ?? ''
  const region = process.env.EXPO_PUBLIC_NHOST_REGION ?? ''
  return `https://${subdomain}.storage.${region}.nhost.run/v1/files/${fileId}`
}
