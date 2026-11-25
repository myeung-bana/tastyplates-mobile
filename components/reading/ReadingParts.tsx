import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  RATING_STAR,
  SUCCESS,
  SURFACE_CARD,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { ReadingFacts, ReadingGroup } from '@/services/readingService'

export function formatScore(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) || n <= 0 ? '—' : n.toFixed(1)
}

export function reviewsLabel(n: number): string {
  return `${n} review${n === 1 ? '' : 's'}`
}

export function Eyebrow({ children }: { children: string }): JSX.Element {
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: FONT.heading, fontSize: 11, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}
    >
      {children}
    </Text>
  )
}

/** 0–5 bar (score ÷ 5 filled in orange). */
export function ScoreBar({ value, muted = false }: { value: number | null; muted?: boolean }): JSX.Element {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / 5))
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: SURFACE_FOG, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3, backgroundColor: muted ? BORDER_SUBTLE : BRAND_PRIMARY }} />
    </View>
  )
}

/** Lock badge for groups under the review threshold. */
export function EarlySignalBadge(): JSX.Element {
  return (
    <View className="flex-row items-center" style={{ gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 999, backgroundColor: SURFACE_FOG }}>
      <AppIcon name="lock" size={11} color={TEXT_TERTIARY} />
      <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 11, color: TEXT_MUTED }}>Early signal</Text>
    </View>
  )
}

/** Fit chip: green for a strong / good match, amber for mixed, grey for weak. */
export function FitChip({ fit }: { fit: NonNullable<ReadingFacts['fit']> }): JSX.Element {
  const palette =
    fit.band === 'strong' || fit.band === 'good'
      ? { bg: '#E7F3EC', fg: SUCCESS }
      : fit.band === 'mixed'
        ? { bg: '#FEF3DC', fg: '#8A5A00' }
        : { bg: SURFACE_FOG, fg: TEXT_MUTED }
  return (
    <View className="self-start justify-center" style={{ height: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: palette.bg }}>
      <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: palette.fg }}>{fit.label}</Text>
    </View>
  )
}

export function SentimentDot({ sentiment }: { sentiment: 'positive' | 'mixed' }): JSX.Element {
  return (
    <View
      accessibilityLabel={sentiment === 'positive' ? 'Mostly positive' : 'Mixed'}
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sentiment === 'positive' ? SUCCESS : RATING_STAR }}
    />
  )
}

/**
 * One of the reader's groups (reading result / error): score, review count, 0–5 bar, why this
 * group, and the AI takeaway when there is one. Tap opens the Groups sheet.
 */
export function GroupCard({
  group,
  takeaway,
  onPress,
}: {
  group: ReadingGroup
  takeaway?: string | null
  onPress?: () => void
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}: ${group.unlocked ? formatScore(group.avg) : 'early signal'}, ${reviewsLabel(group.review_count)}`}
      accessibilityHint="Opens all groups"
      disabled={!onPress}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress?.()
      }}
      className="active:opacity-90"
      style={{ borderRadius: 16, borderWidth: 1.5, borderColor: BORDER_SUBTLE, backgroundColor: SURFACE_CARD, padding: 16, gap: 10 }}
    >
      <View className="flex-row items-center justify-between" style={{ gap: 10 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.heading, fontSize: 16, color: TEXT_HEADING }}>
          {group.name}
        </Text>
        {group.unlocked ? (
          <Text style={{ fontFamily: FONT.heading, fontSize: 20, color: BRAND_PRIMARY }}>{formatScore(group.avg)}</Text>
        ) : (
          <EarlySignalBadge />
        )}
      </View>
      <ScoreBar value={group.unlocked ? group.avg : null} />
      <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>{reviewsLabel(group.review_count)}</Text>
      {group.why ? <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: TEXT_HEADING }}>{group.why}</Text> : null}
      {takeaway ? <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, lineHeight: 19, color: TEXT_HEADING }}>{takeaway}</Text> : null}
    </Pressable>
  )
}
