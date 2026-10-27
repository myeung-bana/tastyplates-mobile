import { Easing } from 'react-native-reanimated'

/**
 * One motion + chrome spec for every bottom sheet (design: `transform .44s cubic-bezier(.32,.72,0,1)`,
 * backdrop `rgba(0,0,0,.5)` fading over .3s). Used by {@link ModalSheet} and {@link AppBottomSheetModal}.
 */

/** iOS-style sheet curve: fast start, long soft settle, no overshoot. */
export const SHEET_EASING = Easing.bezier(0.32, 0.72, 0, 1)

export const SHEET_OPEN_MS = 440
export const SHEET_CLOSE_MS = 300

export const SHEET_OPEN_TIMING = { duration: SHEET_OPEN_MS, easing: SHEET_EASING } as const
export const SHEET_CLOSE_TIMING = { duration: SHEET_CLOSE_MS, easing: SHEET_EASING } as const

/** Backdrop dim at rest. */
export const SHEET_BACKDROP_OPACITY = 0.5

export const SHEET_RADIUS = 24

export const SHEET_HANDLE = { width: 40, height: 5, borderRadius: 3 } as const

/** Drag-to-dismiss: past this share of the sheet height, or this downward velocity (pt/s). */
export const SHEET_DISMISS_DISTANCE_RATIO = 0.28
export const SHEET_DISMISS_VELOCITY = 900

/** Wait this long after closing a sheet before presenting a system UI (camera, picker, share). */
export const SHEET_HANDOFF_DELAY_MS = SHEET_CLOSE_MS + 40
