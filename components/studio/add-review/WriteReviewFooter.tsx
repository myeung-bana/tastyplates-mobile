import { Text, View } from 'react-native'
import type { EdgeInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { BORDER_SUBTLE, SURFACE_CARD, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'

export const WRITE_REVIEW_FOOTER_BUTTON_HEIGHT = 52
const FOOTER_TOP_PAD = 12
const FOOTER_NOTE_HEIGHT = 26

export type WriteReviewFooterProps = {
  onPublish: () => void
  publishing: boolean
  savingDraft?: boolean
  insets: Pick<EdgeInsets, 'bottom'>
  /** Primary action label (defaults to “Publish”). */
  label?: string
  disabled?: boolean
  /** Save draft needs none of the publish requirements (design W3). */
  onSaveDraft?: () => void
  /** "To publish, add a rating, review text and a photo." — shown while something's missing. */
  missingMessage?: string | null
}

/** Pinned footer (design W3): Save draft + Publish, with what's still missing above them. */
export function WriteReviewFooter({
  onPublish,
  publishing,
  savingDraft = false,
  insets,
  label = 'Publish',
  disabled = false,
  onSaveDraft,
  missingMessage = null,
}: WriteReviewFooterProps): JSX.Element {
  const busy = publishing || savingDraft

  return (
    <View
      className="absolute bottom-0 left-0 right-0 px-4"
      style={{
        paddingTop: FOOTER_TOP_PAD,
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: SURFACE_CARD,
        borderTopWidth: 1,
        borderTopColor: BORDER_SUBTLE,
      }}
    >
      {missingMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-center"
          style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 16, color: TEXT_MUTED, height: FOOTER_NOTE_HEIGHT - 6, marginBottom: 6 }}
        >
          {missingMessage}
        </Text>
      ) : null}
      <View className="flex-row" style={{ gap: 10 }}>
        {onSaveDraft ? (
          <View style={{ flex: 1 }}>
            <Button variant="secondary" loading={savingDraft} disabled={busy && !savingDraft} onPress={onSaveDraft}>
              Save draft
            </Button>
          </View>
        ) : null}
        <View style={{ flex: onSaveDraft ? 1.2 : 1 }}>
          <Button loading={publishing} disabled={disabled || (busy && !publishing)} onPress={onPublish}>
            {label}
          </Button>
        </View>
      </View>
    </View>
  )
}

export function getWriteReviewFooterHeight(insets: Pick<EdgeInsets, 'bottom'>, withNote = false): number {
  return FOOTER_TOP_PAD + WRITE_REVIEW_FOOTER_BUTTON_HEIGHT + Math.max(insets.bottom, 12) + (withNote ? FOOTER_NOTE_HEIGHT : 0)
}
