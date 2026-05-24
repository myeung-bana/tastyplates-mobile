import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, type PressableProps, type ViewStyle } from 'react-native'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

type Variant = 'primary' | 'secondary'

type Props = PressableProps & {
  variant?: Variant
  children: ReactNode
  loading?: boolean
  className?: string
}

export function Button({
  variant = 'primary',
  children,
  loading = false,
  disabled,
  className,
  style,
  ...rest
}: Props): JSX.Element {
  const isPrimary = variant === 'primary'
  const busy = loading || disabled

  const baseStyle: ViewStyle = isPrimary
    ? { backgroundColor: BRAND_PRIMARY }
    : { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb' }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      className={`items-center justify-center rounded-full px-5 py-3.5 active:opacity-90 ${busy ? 'opacity-50' : ''} ${className ?? ''}`}
      style={[baseStyle, style as ViewStyle]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#ffffff' : TEXT_HEADING} size="small" />
      ) : typeof children === 'string' ? (
        <Text
          className="font-neusans text-base font-semibold"
          style={{ color: isPrimary ? '#ffffff' : TEXT_HEADING }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
