import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CircleIconButton } from '@/components/navigation/CircleIconButton'
import { GroupsSheet, type GroupsSheetHandle } from '@/components/reading/GroupsSheet'
import { Eyebrow, FitChip, formatScore, GroupCard, reviewsLabel, SentimentDot } from '@/components/reading/ReadingParts'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_TINT,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { Reading, ReadingContent, ReadingFacts, ReadingTheme } from '@/services/readingService'

function updatedLabel(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString() ? 'updated today' : `updated ${d.toLocaleDateString()}`
}

function IconButton({ icon, label, onPress }: { icon: AppIconName; label: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className="items-center justify-center active:opacity-80"
      style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: BORDER_SUBTLE, backgroundColor: SURFACE_CARD }}
    >
      <AppIcon name={icon} size={20} color={TEXT_HEADING} />
    </Pressable>
  )
}

function ThemeCard({ theme, onOpenReviews }: { theme: ReadingTheme; onOpenReviews?: () => void }): JSX.Element {
  return (
    <View style={{ gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE }}>
      <View className="flex-row items-center justify-between" style={{ gap: 10 }}>
        <View className="flex-row items-center" style={{ gap: 8, height: 28, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}>
          <SentimentDot sentiment={theme.sentiment} />
          <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>{theme.label}</Text>
        </View>
        {onOpenReviews ? (
          <Pressable accessibilityRole="link" accessibilityLabel={`${reviewsLabel(theme.review_count)} about ${theme.label}`} onPress={onOpenReviews} hitSlop={8}>
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: BRAND_PRIMARY_DARK }}>{reviewsLabel(theme.review_count)} ›</Text>
          </Pressable>
        ) : (
          <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>{reviewsLabel(theme.review_count)}</Text>
        )}
      </View>
      <Text style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 20, color: TEXT_HEADING }}>{theme.detail}</Text>
      {theme.quote ? (
        <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, fontStyle: 'italic', color: TEXT_MUTED }}>“{theme.quote}”</Text>
      ) : null}
    </View>
  )
}

export type ReadingResultProps = {
  reading: Reading & { facts: ReadingFacts; content: ReadingContent }
  saved: boolean
  saveBusy: boolean
  onToggleSave: () => void
  onShare: () => void
  onWriteReview: () => void
  onOpenThemeReviews: (theme: ReadingTheme) => void
  onFeedback: (value: 1 | -1) => void
  onClose: () => void
}

/** Reading — result (full screen, scrolls) with a fixed Save · Share · Write a review bar. */
export function ReadingResult({
  reading,
  saved,
  saveBusy,
  onToggleSave,
  onShare,
  onWriteReview,
  onOpenThemeReviews,
  onFeedback,
  onClose,
}: ReadingResultProps): JSX.Element {
  const insets = useSafeAreaInsets()
  const groupsRef = useRef<GroupsSheetHandle>(null)
  const [feedback, setFeedback] = useState<1 | -1 | null>(reading.feedback)
  const { facts, content } = reading

  const vote = (value: 1 | -1) => {
    void Haptics.selectionAsync()
    setFeedback(value)
    onFeedback(value)
  }

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_CARD }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 20, paddingBottom: 120 + insets.bottom, gap: 26 }}>
        {/* Header */}
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 26, lineHeight: 32, color: TEXT_HEADING }}>
            {facts.restaurant.title}
          </Text>
          <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
            {facts.restaurant.cuisine ? (
              <View className="justify-center" style={{ height: 28, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}>
                <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>{facts.restaurant.cuisine}</Text>
              </View>
            ) : null}
            <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>
              Based on {reviewsLabel(facts.based_on)} · {updatedLabel(reading.updated_at)}
            </Text>
          </View>
        </View>

        {/* Hero */}
        <View style={{ gap: 12, padding: 18, borderRadius: 20, backgroundColor: BRAND_PRIMARY_TINT, borderWidth: 1, borderColor: '#FFE2C7' }}>
          <View className="flex-row items-end" style={{ gap: 18 }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>Your circles</Text>
              <Text style={{ fontFamily: FONT.heading, fontSize: 56, lineHeight: 60, color: BRAND_PRIMARY }}>{formatScore(facts.circles.avg)}</Text>
            </View>
            <View style={{ gap: 2, paddingBottom: 8 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>Overall</Text>
              <Text style={{ fontFamily: FONT.heading, fontSize: 24, lineHeight: 28, color: TEXT_HEADING }}>{formatScore(facts.overall.avg)}</Text>
            </View>
          </View>
          {facts.fit ? <FitChip fit={facts.fit} /> : null}
          <Text style={{ fontFamily: FONT.heading, fontSize: 19, lineHeight: 25, color: TEXT_HEADING }}>{content.headline}</Text>
        </View>

        <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 23, color: TEXT_HEADING }}>{content.summary}</Text>

        {facts.your_groups.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Eyebrow>Your groups</Eyebrow>
            {facts.your_groups.map((g) => (
              <GroupCard key={g.slug} group={g} takeaway={content.group_takeaways[g.slug]} onPress={() => groupsRef.current?.present()} />
            ))}
          </View>
        ) : null}

        {content.agree ? (
          <View style={{ gap: 8 }}>
            <Eyebrow>Where they agree</Eyebrow>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: TEXT_HEADING }}>{content.agree}</Text>
          </View>
        ) : null}

        {content.themes.length > 0 ? (
          <View>
            <Eyebrow>What reviewers mention</Eyebrow>
            {content.themes.map((t) => (
              <ThemeCard key={t.label} theme={t} onOpenReviews={t.review_ids.length > 0 ? () => onOpenThemeReviews(t) : undefined} />
            ))}
          </View>
        ) : null}

        <View className="flex-row items-center" style={{ gap: 8 }}>
          <AppIcon name="bar-chart-2" size={16} color={TEXT_MUTED} />
          <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>{facts.confidence.label}</Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER_SUBTLE }}>
          <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 12, lineHeight: 18, color: TEXT_TERTIARY }}>
            Scores are calculated by TastyPlates. AI wrote this summary.
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Helpful" accessibilityState={{ selected: feedback === 1 }} hitSlop={8} onPress={() => vote(1)}>
            <AppIcon name="thumbs-up" size={20} color={feedback === 1 ? BRAND_PRIMARY : TEXT_MUTED} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Not helpful" accessibilityState={{ selected: feedback === -1 }} hitSlop={8} onPress={() => vote(-1)}>
            <AppIcon name="thumbs-down" size={20} color={feedback === -1 ? BRAND_PRIMARY : TEXT_MUTED} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
        <CircleIconButton icon="x" accessibilityLabel="Close reading" onPress={onClose} />
      </View>

      {/* Fixed bottom bar: Save (To-Dine) toggle, Share, Write a review. */}
      <View
        className="flex-row items-center"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          gap: 10,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: SURFACE_CARD,
          borderTopWidth: 1,
          borderTopColor: BORDER_SUBTLE,
        }}
      >
        <Button
          variant={saved ? 'outline' : 'primary'}
          disabled={saveBusy}
          onPress={onToggleSave}
          accessibilityRole="switch"
          accessibilityState={{ checked: saved, disabled: saveBusy }}
          accessibilityLabel={saved ? 'Saved to To-Dine' : 'Save to To-Dine'}
          style={{ flex: 1 }}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <AppIcon name="bookmark" active={saved} size={18} color={saved ? BRAND_PRIMARY : SURFACE_CARD} />
            <Text style={{ fontFamily: FONT.heading, fontSize: 17, letterSpacing: 0.6, color: saved ? BRAND_PRIMARY_DARK : SURFACE_CARD }}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </View>
        </Button>
        <IconButton icon="share" label="Share" onPress={onShare} />
        <IconButton icon="edit-3" label="Write a review" onPress={onWriteReview} />
      </View>

      <GroupsSheet ref={groupsRef} facts={facts} onRead={() => groupsRef.current?.dismiss()} />
    </View>
  )
}

/** Reading — error: Retry, then the reader's group cards so scores still show. */
export function ReadingError({
  facts,
  onRetry,
  onClose,
}: {
  facts: ReadingFacts | null
  onRetry: () => void
  onClose: () => void
}): JSX.Element {
  const insets = useSafeAreaInsets()
  const groupsRef = useRef<GroupsSheetHandle>(null)
  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_CARD }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 72, paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 22, lineHeight: 28, color: TEXT_HEADING }}>
          We couldn’t write your reading right now
        </Text>
        <Button onPress={onRetry}>Retry</Button>
        {facts && facts.your_groups.length > 0 ? (
          <View style={{ gap: 12, marginTop: 14 }}>
            <Eyebrow>Your groups</Eyebrow>
            {facts.your_groups.map((g) => (
              <GroupCard key={g.slug} group={g} onPress={() => groupsRef.current?.present()} />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
        <CircleIconButton icon="x" accessibilityLabel="Close" onPress={onClose} />
      </View>
      {facts ? <GroupsSheet ref={groupsRef} facts={facts} onRead={onRetry} /> : null}
    </View>
  )
}
