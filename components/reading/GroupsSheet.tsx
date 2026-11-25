import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type ElementRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BottomSheetFooter, BottomSheetScrollView, type BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { EarlySignalBadge, Eyebrow, formatScore, reviewsLabel, ScoreBar } from '@/components/reading/ReadingParts'
import { AppBottomSheetModal } from '@/components/ui/AppBottomSheetModal'
import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { BORDER_SUBTLE, BRAND_PRIMARY, SURFACE_CARD, TEXT_HEADING, TEXT_MUTED, TEXT_TERTIARY } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { ReadingFacts, ReadingGroup } from '@/services/readingService'

export type GroupsSheetHandle = { present: () => void; dismiss: () => void }

type Props = {
  facts: ReadingFacts
  /** Fixed footer action ("Read it for me"); from the reading it just returns to it. */
  onRead: () => void
}

function GroupRow({ group }: { group: ReadingGroup }): JSX.Element {
  const [open, setOpen] = useState(false)
  const withReviews = group.members.filter((m) => m.review_count > 0)
  const silent = group.members.filter((m) => m.review_count === 0)

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${group.name}, ${group.unlocked ? formatScore(group.avg) : 'early signal'}, ${reviewsLabel(group.review_count)}`}
        onPress={() => {
          void Haptics.selectionAsync()
          setOpen((v) => !v)
        }}
        className="active:opacity-80"
        style={{ paddingVertical: 14, gap: 8 }}
      >
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.heading, fontSize: 15, color: TEXT_HEADING }}>
            {group.name}
          </Text>
          {group.unlocked ? (
            <Text style={{ fontFamily: FONT.heading, fontSize: 17, color: BRAND_PRIMARY }}>{formatScore(group.avg)}</Text>
          ) : (
            <EarlySignalBadge />
          )}
          <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT_TERTIARY} />
        </View>
        {group.unlocked ? <ScoreBar value={group.avg} /> : null}
        <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>{reviewsLabel(group.review_count)}</Text>
      </Pressable>

      {open ? (
        <View style={{ paddingBottom: 14, paddingLeft: 12, gap: 8 }}>
          {withReviews.map((m) => (
            <View key={m.slug} className="flex-row items-center" style={{ gap: 10 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, color: TEXT_HEADING }}>
                {m.name}
              </Text>
              <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>{formatScore(m.avg)}</Text>
              <Text style={{ width: 76, textAlign: 'right', fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
                {reviewsLabel(m.review_count)}
              </Text>
            </View>
          ))}
          {silent.length > 0 ? (
            <Text style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 18, color: TEXT_TERTIARY }}>
              No reviews yet from {silent.map((m) => m.name).join(', ')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/** Groups at a restaurant (opened from the reading): your groups, then other groups; rows expand to member cuisines. */
export const GroupsSheet = forwardRef<GroupsSheetHandle, Props>(function GroupsSheet({ facts, onRead }, ref) {
  const insets = useSafeAreaInsets()
  const sheetRef = useRef<ElementRef<typeof AppBottomSheetModal>>(null)

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }))

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: SURFACE_CARD,
            borderTopWidth: 1,
            borderTopColor: BORDER_SUBTLE,
          }}
        >
          <Button onPress={onRead}>Read it for me</Button>
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, onRead],
  )

  return (
    <AppBottomSheetModal ref={sheetRef} snapPoints={['85%']} enableDynamicSizing={false} footerComponent={renderFooter}>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120 + insets.bottom }}>
        <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 22, lineHeight: 28, color: TEXT_HEADING }}>
          Groups at {facts.restaurant.title}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: TEXT_MUTED }}>
          Scores from reviewers who grew up with these cuisines.
        </Text>

        {facts.your_groups.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Eyebrow>Your groups</Eyebrow>
            {facts.your_groups.map((g) => (
              <GroupRow key={g.slug} group={g} />
            ))}
          </View>
        ) : null}

        {facts.other_groups.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Eyebrow>Other groups</Eyebrow>
            {facts.other_groups.map((g) => (
              <GroupRow key={g.slug} group={g} />
            ))}
          </View>
        ) : null}
      </BottomSheetScrollView>
    </AppBottomSheetModal>
  )
})
