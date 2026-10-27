import { createContext, useContext } from 'react'

/**
 * True while the auth layer animates out, before its Modal is removed. Lives apart from
 * `AuthSheetContext` so the overlay layout can read it without an import cycle.
 */
export const AuthSheetClosingContext = createContext(false)

/** Lets the auth sheet / page play its exit animation (see `AuthOverlayLayout`). */
export function useAuthSheetClosing(): boolean {
  return useContext(AuthSheetClosingContext)
}
