import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { BRAND_PRIMARY, BRAND_PRIMARY_DARK, BRAND_PRIMARY_TINT, TEXT_HEADING, TEXT_MUTED, TEXT_TERTIARY } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { ReadingCardState } from '@/services/readingService'

/** Soft-orange border for the reading card. */
const CARD_BORDER = '#FFE2C7'

export type ReadingCardProps = {
  restaurantTitle: string
  /** From `readings/get-reading-state`; null while loading. */
  state: ReadingCardState | null
  updatedAt?: string | null
  onRead: () => void
  onView: () => void
  onSignIn: () => void
  onSetPalates: () => void
  onWriteReview: () => void
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
}

/**
 * "Get your personalised reading" (restaurant detail, under Ratings). The backend picks the state:
 * Default · Ready · Not enough · No palates · Guest · Daily limit (plus Pending while it writes).
 */
export function ReadingCard({
  restaurantTitle,
  state,
  updatedAt,
  onRead,
  onView,
  onSignIn,
  onSetPalates,
  onWriteReview,
}: ReadingCardProps): JSX.Element {
  let action: JSX.Element
  let note: JSX.Element | null = null

  switch (state) {
    case null:
      action = (
        <View style={{ height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      )
      break
    case 'ready':
      action = (
        <Button variant="outline" onPress={onView}>
          View your reading
        </Button>
      )
      note = <Note>{isToday(updatedAt) ? 'Updated today' : 'Updated recently'}</Note>
      break
    case 'pending':
      action = (
        <Button variant="outline" onPress={onView}>
          Writing your reading…
        </Button>
      )
      break
    case 'not_enough':
      action = <Button disabled>Read it for me</Button>
      note = (
        <View className="items-center" style={{ gap: 6 }}>
          <Note>Not enough reviews from your palate yet</Note>
          <Pressable accessibilityRole="link" onPress={onWriteReview} hitSlop={8}>
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: BRAND_PRIMARY_DARK, textDecorationLine: 'underline' }}>
              Write a review
            </Text>
          </Pressable>
        </View>
      )
      break
    case 'no_palates':
      action = <Button onPress={onSetPalates}>Set your palates</Button>
      break
    case 'guest':
      action = <Button onPress={onSignIn}>Sign in</Button>
      break
    case 'daily_limit':
      action = <Button disabled>Try again tomorrow</Button>
      break
    default:
      action = <Button onPress={onRead}>Read it for me</Button>
  }

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        backgroundColor: BRAND_PRIMARY_TINT,
        padding: 18,
        gap: 14,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 18, lineHeight: 23, color: TEXT_HEADING }}>
          Get your personalised reading
        </Text>
        <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: TEXT_MUTED }}>
          How people with your palate see {restaurantTitle}
        </Text>
      </View>
      {action}
      {note}
      <Text style={{ textAlign: 'center', fontFamily: FONT.body, fontSize: 11, color: TEXT_TERTIARY }}>
        AI-written summary of TastyPlates scores
      </Text>
    </View>
  )
}

function Note({ children }: { children: string }): JSX.Element {
  return <Text style={{ textAlign: 'center', fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>{children}</Text>
}
