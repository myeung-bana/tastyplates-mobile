import { Feather, Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import type { StyleProp, TextStyle } from 'react-native'

import { resolveIconSize, type IconSizeToken } from '@/constants/icons'

export type FeatherIconName = ComponentProps<typeof Feather>['name']

/**
 * Icons outside the Feather set — keep localized here (not scattered Ionicons imports).
 * - `restaurant` — cutlery tab / food metaphor (Ionicons)
 * - `logo-google` — brand sign-in button
 * - `star-half` — half-star ratings
 */
export type AppIconExceptionName = 'restaurant' | 'logo-google' | 'star-half'

export type AppIconName = FeatherIconName | AppIconExceptionName

export interface AppIconProps {
  name: AppIconName
  size?: IconSizeToken | number
  color?: string
  /**
   * Heavier visual weight where the set has no separate glyph:
   * - `restaurant` — filled cutlery (Ionicons)
   * - `star` / `heart` — filled (Ionicons) vs outline (Feather)
   */
  active?: boolean
  style?: StyleProp<TextStyle>
}

/**
 * Standard UI icon — Feather (`@expo/vector-icons`), matching web `react-icons/fi`.
 * Exceptions: restaurant cutlery, Google logo, half-star.
 */
export function AppIcon({
  name,
  size = 'md',
  color = '#31343F',
  active = false,
  style,
}: AppIconProps): JSX.Element {
  const px = resolveIconSize(size)

  if (name === 'restaurant') {
    return (
      <Ionicons
        name={active ? 'restaurant' : 'restaurant-outline'}
        size={px}
        color={color}
        style={style}
      />
    )
  }

  if (name === 'logo-google') {
    return <Ionicons name="logo-google" size={px} color={color} style={style} />
  }

  if (name === 'star-half') {
    return <Ionicons name="star-half" size={px} color={color} style={style} />
  }

  /** Ratings: filled (Ionicons) vs outline (Feather `star`). */
  if (name === 'star') {
    if (active) {
      return <Ionicons name="star" size={px} color={color} style={style} />
    }
    return <Feather name="star" size={px} color={color} style={style} />
  }

  /** Likes: filled (Ionicons) vs outline (Feather `heart`). */
  if (name === 'heart') {
    if (active) {
      return <Ionicons name="heart" size={px} color={color} style={style} />
    }
    return <Feather name="heart" size={px} color={color} style={style} />
  }

  return <Feather name={name as FeatherIconName} size={px} color={color} style={style} />
}
