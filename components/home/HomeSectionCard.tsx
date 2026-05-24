import type { ReactNode } from 'react'
import { View } from 'react-native'

import { SectionTitle } from '@/components/layout/SectionTitle'

type Props = {
  title: string
  children: ReactNode
  /** Optional trailing control (e.g. “See all”). */
  headerRight?: ReactNode
  className?: string
  /** @default true */
  shadowed?: boolean
}

/** Shared home section shell — matches Quick finds card + title style. */
export function HomeSectionCard({
  title,
  children,
  headerRight,
  className,
  shadowed = true,
}: Props): JSX.Element {
  return (
    <View className={`mt-6 w-full px-4 ${className ?? ''}`}>
      <View
        className={`rounded-2xl bg-white p-3 ${shadowed ? 'shadow-sm shadow-black/5' : ''}`}
      >
        <View className="flex-row items-center justify-between gap-2">
          <SectionTitle>{title}</SectionTitle>
          {headerRight ?? null}
        </View>
        <View className="mt-3">{children}</View>
      </View>
    </View>
  )
}
