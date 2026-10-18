import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { SectionTitle } from '@/components/layout/SectionTitle'
import { TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'

type Props = {
  title: string
  children: ReactNode
  /** Optional trailing control (e.g. “See all”). Prefer {@link onSeeAll}. */
  headerRight?: ReactNode
  /** Renders a “See all” link on the right of the title. */
  onSeeAll?: () => void
  className?: string
  /** @deprecated Kept for call-site compatibility; sections are flat in brand v1.0. */
  shadowed?: boolean
  /** @deprecated Kept for call-site compatibility. */
  padded?: boolean
  /** Let children extend past the right screen edge (keeps left aligned with the title). */
  contentBleed?: boolean
}

/** Home section (design H1): Jost title + optional "See all", 20px gutters, no card chrome. */
export function HomeSectionCard({
  title,
  children,
  headerRight,
  onSeeAll,
  className,
  contentBleed = false,
}: Props): JSX.Element {
  return (
    <View className={`w-full ${className ?? ''}`} style={{ marginTop: 24 }}>
      <View className="flex-row items-baseline justify-between" style={{ paddingHorizontal: 20, gap: 8 }}>
        <SectionTitle>{title}</SectionTitle>
        {headerRight ??
          (onSeeAll ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`See all ${title}`} onPress={onSeeAll} hitSlop={8}>
              <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>See all</Text>
            </Pressable>
          ) : null)}
      </View>
      <View style={{ marginTop: 12, paddingLeft: 20, paddingRight: contentBleed ? 0 : 20 }}>{children}</View>
    </View>
  )
}
