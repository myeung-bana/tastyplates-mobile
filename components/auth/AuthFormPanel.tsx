import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'

type AuthFormPanelProps = {
  title: string
  subtitle?: string
  headerSlot?: ReactNode
  children: ReactNode
}

/** White auth form panel — title, optional back, and form body. */
export function AuthFormPanel({
  title,
  subtitle,
  headerSlot,
  children,
}: AuthFormPanelProps): JSX.Element {
  return (
    <View className="bg-white px-5 pb-4 pt-6">
      {headerSlot ? <View className="mb-5">{headerSlot}</View> : null}

      <Text
        className="text-center text-2xl font-bold"
        style={{ color: TEXT_HEADING }}
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          className="mt-2 text-center text-base leading-relaxed"
          style={{ color: TEXT_MUTED }}
          maxFontSizeMultiplier={1.25}
        >
          {subtitle}
        </Text>
      ) : null}

      <View className="mt-6">{children}</View>
    </View>
  )
}

export const authSheetPanelStyle = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
})
