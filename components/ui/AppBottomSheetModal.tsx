import { forwardRef, useCallback, type ElementRef } from 'react'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet'

import { BORDER_SUBTLE, SURFACE_CARD } from '@/constants/brand'
import {
  SHEET_BACKDROP_OPACITY,
  SHEET_EASING,
  SHEET_HANDLE,
  SHEET_OPEN_MS,
  SHEET_RADIUS,
} from '@/constants/sheet'

export type AppBottomSheetModalProps = BottomSheetModalProps & {
  /** Backdrop tap closes the sheet (default). */
  closeOnBackdropPress?: boolean
}

/**
 * `@gorhom/bottom-sheet` modal with the app's sheet spec (`constants/sheet`): the design's sheet
 * curve for present / snap / dismiss, a 0.5 backdrop that fades with the sheet, 24pt corners and
 * the 40×5 grabber. Any prop can still be overridden per sheet.
 */
export const AppBottomSheetModal = forwardRef<ElementRef<typeof BottomSheetModal>, AppBottomSheetModalProps>(
  function AppBottomSheetModal({ closeOnBackdropPress = true, children, ...props }, ref) {
    const animationConfigs = useBottomSheetTimingConfigs({ duration: SHEET_OPEN_MS, easing: SHEET_EASING })

    const renderBackdrop = useCallback(
      (backdropProps: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={SHEET_BACKDROP_OPACITY}
          pressBehavior={closeOnBackdropPress ? 'close' : 'none'}
        />
      ),
      [closeOnBackdropPress],
    )

    return (
      <BottomSheetModal
        ref={ref}
        animationConfigs={animationConfigs}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: BORDER_SUBTLE, width: SHEET_HANDLE.width, height: SHEET_HANDLE.height }}
        backgroundStyle={{ backgroundColor: SURFACE_CARD, borderTopLeftRadius: SHEET_RADIUS, borderTopRightRadius: SHEET_RADIUS }}
        {...props}
      >
        {children}
      </BottomSheetModal>
    )
  },
)
