/**
 * Central toast API — pill-shaped dark overlay, white text.
 * Rendered by {@link ToastHost} in the root layout.
 */

import {
  TOAST_DEFAULT_DURATION,
  TOAST_ERROR_DURATION,
} from '@/constants/toast'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  type?: ToastType
  duration?: number
}

export interface ToastPayload {
  message: string
  type: ToastType
  duration: number
}

type ToastSubscriber = (payload: ToastPayload | null) => void

const subscribers = new Set<ToastSubscriber>()
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function subscribeToToasts(subscriber: ToastSubscriber): () => void {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

function emit(payload: ToastPayload | null): void {
  subscribers.forEach((subscriber) => subscriber(payload))
}

/** Show a toast message. Only one toast is visible at a time. */
export function showToast(message: string, options: ToastOptions = {}): void {
  const { type = 'info', duration = TOAST_DEFAULT_DURATION } = options

  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  emit({ message, type, duration })

  hideTimer = setTimeout(() => {
    emit(null)
    hideTimer = null
  }, duration)
}

export const toast = {
  success: (message: string, duration = TOAST_DEFAULT_DURATION) =>
    showToast(message, { type: 'success', duration }),

  error: (message: string, duration = TOAST_ERROR_DURATION) =>
    showToast(message, { type: 'error', duration }),

  info: (message: string, duration = TOAST_DEFAULT_DURATION) =>
    showToast(message, { type: 'info', duration }),

  warning: (message: string, duration = TOAST_DEFAULT_DURATION) =>
    showToast(message, { type: 'warning', duration }),
}
