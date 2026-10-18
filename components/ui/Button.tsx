import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, type PressableProps, type ViewStyle } from 'react-native'

import { BORDER_SUBTLE, BRAND_PRIMARY, DANGER, SURFACE_CARD, TEXT_HEADING } from '@/constants/brand'
import { FONT } from '@/constants/typography'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

/** Brand v1.0 disabled CTA — a lighter orange, not an opacity fade. */
const PRIMARY_DISABLED = '#FFB070'

type Props = PressableProps & {
  variant?: Variant
  children: ReactNode
  loading?: boolean
  className?: string
  /** 52 (default) for page CTAs, 44 for sheet / inline actions. */
  size?: 'lg' | 'md'
}

/** Pill CTA from brand v1.0: 52px, Jost 600 17px, slight tracking. */
export function Button({
  variant = 'primary',
  children,
  loading = false,
  disabled,
  className,
  style,
  size = 'lg',
  ...rest
}: Props): JSX.Element {
  const inactive = loading || Boolean(disabled)

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: disabled ? PRIMARY_DISABLED : BRAND_PRIMARY, fg: '#FFFFFF' },
    secondary: { bg: SURFACE_CARD, fg: TEXT_HEADING, border: BORDER_SUBTLE },
    danger: { bg: disabled ? '#F5C9C3' : DANGER, fg: '#FFFFFF' },
    ghost: { bg: 'transparent', fg: TEXT_HEADING },
  }
  const { bg, fg, border } = palette[variant]

  const baseStyle: ViewStyle = {
    height: size === 'lg' ? 52 : 44,
    borderRadius: 999,
    backgroundColor: bg,
    paddingHorizontal: 20,
    ...(border ? { borderWidth: 1.5, borderColor: border } : null),
    ...(variant === 'secondary' || variant === 'ghost'
      ? { opacity: disabled ? 0.5 : 1 }
      : null),
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      className={`flex-row items-center justify-center active:opacity-90 ${className ?? ''}`}
      style={[baseStyle, style as ViewStyle]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : typeof children === 'string' ? (
        <Text
          style={{
            color: fg,
            fontFamily: FONT.heading,
            fontSize: size === 'lg' ? 17 : 15,
            letterSpacing: 0.6,
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
