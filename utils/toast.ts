/**
 * Toast notification utility.
 *
 * Wraps the toast library with Tastyplates-specific defaults.
 * A single active toast is shown at a time — no stacked notifications.
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  type?: ToastType
  duration?: number
}

/**
 * Show a toast message.
 *
 * NOTE: Wire this to your actual toast library (e.g. react-native-toast-message)
 * once it is installed. For now this is a typed no-op placeholder.
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const { type = 'info', duration = 3000 } = options

  if (__DEV__) {
    const prefix = type.toUpperCase()
    console.log(`[Toast:${prefix}] ${message} (${duration}ms)`)
  }
}

export const toast = {
  success: (message: string, duration?: number) =>
    showToast(message, { type: 'success', duration }),

  error: (message: string, duration?: number) =>
    showToast(message, { type: 'error', duration }),

  info: (message: string, duration?: number) =>
    showToast(message, { type: 'info', duration }),

  warning: (message: string, duration?: number) =>
    showToast(message, { type: 'warning', duration }),
}
