import { Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { ARTICLE_CATEGORY_BG, BRAND_PRIMARY } from '@/constants/brand'

export type ArticleCategoryTagVariant = 'overlay' | 'inline'

export type ArticleCategoryTagProps = {
  category: string | null | undefined
  /** `overlay` — on hero image (white pill); `inline` — on white body (cream pill). */
  variant?: ArticleCategoryTagVariant
  className?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Canonical article category pill — home cards and article detail header.
 * @see documentation/design_system.md §11.7
 */
export function ArticleCategoryTag({
  category,
  variant = 'inline',
  className,
  style,
}: ArticleCategoryTagProps): JSX.Element | null {
  const label = category?.trim()
  if (!label) return null

  const isOverlay = variant === 'overlay'

  return (
    <View
      className={`rounded-full px-2.5 py-1 ${isOverlay ? 'bg-white/95' : ''} ${className ?? ''}`}
      style={[isOverlay ? undefined : { backgroundColor: ARTICLE_CATEGORY_BG }, style]}
      accessibilityRole="text"
      accessibilityLabel={`Category: ${label}`}
    >
      <Text
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: BRAND_PRIMARY }}
      >
        {label}
      </Text>
    </View>
  )
}
