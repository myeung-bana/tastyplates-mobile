import { NhostClient } from '@nhost/nhost-js'
import * as SecureStore from 'expo-secure-store'

/**
 * Nhost `rewriteRedirectTo` merges `redirectTo` with `clientUrl` (from `window.location.origin`).
 * On React Native that breaks custom-scheme URLs (`tastyplates://…` → `null/`). Force an empty origin
 * so mobile deep links are sent to Auth unchanged.
 */
function disableNhostAuthClientUrl(): void {
  if (typeof window === 'undefined' || window.location == null) return
  try {
    Object.defineProperty(window.location, 'origin', {
      get: () => '',
      configurable: true,
    })
  } catch {
    // Already patched or non-configurable — safe to continue.
  }
}

disableNhostAuthClientUrl()

export const nhost = new NhostClient({
  subdomain: process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN!,
  region: process.env.EXPO_PUBLIC_NHOST_REGION!,
  clientStorageType: 'expo-secure-storage',
  clientStorage: SecureStore,
})
