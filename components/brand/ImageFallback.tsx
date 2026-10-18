import { useState } from 'react'
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'

import { TpMark } from '@/components/brand/TpMark'
import { FALLBACK_GLYPH, SURFACE_FOG } from '@/constants/brand'

/** Pin height as a share of the shorter side — quiet at every size (design “Image fallbacks”). */
const MARK_RATIO = 0.29

type Props = {
  style?: StyleProp<ViewStyle>
  /** Known size skips the layout pass (thumbs, rows). */
  size?: number
}

/**
 * Placeholder for a place with no photo (Google-only places, new listings, failed loads):
 * fog field with the grey pin. No text, no orange.
 */
export function ImageFallback({ style, size }: Props): JSX.Element {
  const [shorter, setShorter] = useState(size ?? 0)
  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout
    setShorter(Math.min(width, height))
  }
  return (
    <View
      onLayout={size ? undefined : onLayout}
      className="items-center justify-center"
      style={[{ backgroundColor: SURFACE_FOG }, size ? { width: size, height: size } : null, style]}
      accessibilityRole="image"
      accessibilityLabel="No photo"
    >
      {shorter > 0 ? <TpMark size={Math.max(10, shorter * MARK_RATIO)} color={FALLBACK_GLYPH} /> : null}
    </View>
  )
}
