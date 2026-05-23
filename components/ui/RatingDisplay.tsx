import { Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { RATING_STAR_INK, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { formatRatingValue } from '@/lib/ratingDisplayUtils'

export type RatingDisplaySize = 'xs' | 'sm' | 'md'

const SIZE_STYLES: Record<
  RatingDisplaySize,
  { star: number; score: number; gap: number; scoreWeight: '500' | '600' }
> = {
  xs: { star: 11, score: 12, gap: 2, scoreWeight: '500' },
  sm: { star: 12, score: 12, gap: 2, scoreWeight: '500' },
  md: { star: 14, score: 16, gap: 4, scoreWeight: '600' },
}

export type RatingDisplayProps = {
  value: number | null | undefined
  size?: RatingDisplaySize
  /** Short count after score, e.g. ` (12)`. */
  reviewCount?: number | null
  /** Optional prefix before star, e.g. `Japanese` → `Japanese ★ 4.3`. */
  label?: string
  className?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Canonical inline rating — Recent reviews pattern; black star + heading-colored score.
 * @see documentation/design_system.md §11.6
 */
export function RatingDisplay({
  value,
  size = 'sm',
  reviewCount,
  label,
  className,
  style,
}: RatingDisplayProps): JSX.Element | null {
  const formatted = formatRatingValue(value)
  if (!formatted) return null

  const { star, score, gap, scoreWeight } = SIZE_STYLES[size]
  const showCount = reviewCount != null && reviewCount > 0

  return (
    <View
      className={`flex-row items-center ${className ?? ''}`}
      style={[{ gap }, style]}
      accessibilityRole="text"
      accessibilityLabel={
        formatted
          ? `Rating ${formatted} out of 5${showCount ? `, ${reviewCount} reviews` : ''}`
          : undefined
      }
    >
      {label ? (
        <Text
          style={{ fontSize: score, fontWeight: scoreWeight, color: TEXT_MUTED }}
          numberOfLines={1}
        >
          {label}{' '}
        </Text>
      ) : null}
      {formatted ? (
        <>
          <Text
            style={{ fontSize: star, color: RATING_STAR_INK }}
            importantForAccessibility="no"
          >
            ★
          </Text>
          <Text style={{ fontSize: score, fontWeight: scoreWeight, color: TEXT_HEADING }}>
            {formatted}
          </Text>
          {showCount ? (
            <Text style={{ fontSize: score, color: TEXT_MUTED }}> ({reviewCount})</Text>
          ) : null}
        </>
      ) : null}
    </View>
  )
}
