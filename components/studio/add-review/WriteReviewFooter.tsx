import { View } from 'react-native'
import type { EdgeInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'

/** Vertical space for the publish button (`Button` py-3.5 + label). */
export const WRITE_REVIEW_FOOTER_BUTTON_HEIGHT = 48
const FOOTER_TOP_PAD = 12

export type WriteReviewFooterProps = {
  onPublish: () => void
  publishing: boolean
  savingDraft?: boolean
  insets: Pick<EdgeInsets, 'bottom'>
  /** Primary action label (defaults to “Share Review”). */
  label?: string
  disabled?: boolean
}

/** Full-width primary action pinned to the bottom of the screen. */
export function WriteReviewFooter({
  onPublish,
  publishing,
  savingDraft = false,
  insets,
  label = 'Share Review',
  disabled = false,
}: WriteReviewFooterProps): JSX.Element {
  const busy = publishing || savingDraft

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-white px-4"
      style={{
        paddingTop: FOOTER_TOP_PAD,
        paddingBottom: insets.bottom,
      }}
    >
      <Button
        variant="primary"
        className="w-full"
        loading={publishing}
        disabled={disabled || (busy && !publishing)}
        onPress={onPublish}
      >
        {label}
      </Button>
    </View>
  )
}

export function getWriteReviewFooterHeight(insets: Pick<EdgeInsets, 'bottom'>): number {
  return FOOTER_TOP_PAD + WRITE_REVIEW_FOOTER_BUTTON_HEIGHT + insets.bottom
}
