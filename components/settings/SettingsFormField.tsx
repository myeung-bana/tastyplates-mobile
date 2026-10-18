import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'

type Props = {
  label: string
  helper?: string
  error?: string | null
  children: ReactNode
}

export function SettingsFormField({ label, helper, error, children }: Props): JSX.Element {
  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-body-medium" style={{ color: TEXT_HEADING }}>
        {label}
      </Text>
      {children}
      {error ? (
        <Text className="mt-1 text-sm text-red-600 font-body">{error}</Text>
      ) : helper ? (
        <Text className="mt-1 text-xs font-body" style={{ color: TEXT_MUTED }}>
          {helper}
        </Text>
      ) : null}
    </View>
  )
}
