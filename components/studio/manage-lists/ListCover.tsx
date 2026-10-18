import { Image, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { TpMark } from '@/components/brand/TpMark'
import { BRAND_PRIMARY, FALLBACK_GLYPH, SURFACE_FOG, TEXT_HEADING } from '@/constants/brand'
import { FONT } from '@/constants/typography'

/** Four brand colourways for generated covers (design L1): base / alternate tile / glyph. */
const COLOURWAYS = [
  { base: BRAND_PRIMARY, alt: '#EC6A00', glyph: '#FFFFFF' },
  { base: TEXT_HEADING, alt: '#3F424C', glyph: BRAND_PRIMARY },
  { base: SURFACE_FOG, alt: '#E4E5E9', glyph: FALLBACK_GLYPH },
  { base: '#FFF3E8', alt: '#FFE2C7', glyph: BRAND_PRIMARY },
] as const

function colourwayFor(seed: string): (typeof COLOURWAYS)[number] {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return COLOURWAYS[Math.abs(hash) % COLOURWAYS.length]!
}

type Props = {
  title: string
  /** Number of places — picks initial (0), single mark (1–3) or 2×2 mosaic (4+). */
  count: number
  /** A custom photo always wins over the generated cover. */
  imageUrl?: string | null
  /** Stable seed for the colourway (list uuid). */
  seed: string
  size: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Playlist cover (design L1/L3): custom photo, else a generated cover in one of four colourways.
 * The design's cuisine icons need item cuisines, which list endpoints don't return yet, so the
 * brand pin stands in for them.
 */
export function ListCover({ title, count, imageUrl, seed, size, radius = 12, style }: Props): JSX.Element {
  const frame: ViewStyle = { width: size, height: size, borderRadius: radius, overflow: 'hidden' }
  if (imageUrl?.trim()) {
    return (
      <Image
        source={{ uri: imageUrl.trim() }}
        style={[frame, { backgroundColor: SURFACE_FOG }, style as object]}
        accessibilityIgnoresInvertColors
      />
    )
  }

  const c = colourwayFor(seed)
  if (count >= 4) {
    const tile = size / 2
    return (
      <View style={[frame, { flexDirection: 'row', flexWrap: 'wrap' }, style]} accessibilityElementsHidden>
        {[c.base, c.alt, c.alt, c.base].map((bg, i) => (
          <View key={i} className="items-center justify-center" style={{ width: tile, height: tile, backgroundColor: bg }}>
            <TpMark size={tile * 0.34} color={c.glyph} />
          </View>
        ))}
      </View>
    )
  }

  return (
    <View className="items-center justify-center" style={[frame, { backgroundColor: c.base }, style]} accessibilityElementsHidden>
      {count === 0 ? (
        <Text style={{ fontFamily: FONT.heading, fontSize: size * 0.42, color: c.glyph }}>
          {(title.trim()[0] ?? '?').toUpperCase()}
        </Text>
      ) : (
        <TpMark size={size * 0.34} color={c.glyph} />
      )}
    </View>
  )
}

/** System covers for the two library lists (design L1 “Your library”). */
export function LibraryCover({ kind, size }: { kind: 'saved' | 'visited'; size: number }): JSX.Element {
  const saved = kind === 'saved'
  return (
    <View
      style={{ width: size, height: size, borderRadius: 12, backgroundColor: saved ? BRAND_PRIMARY : TEXT_HEADING }}
      accessibilityElementsHidden
    >
      <Text
        style={{
          position: 'absolute',
          left: size * 0.12,
          top: size * 0.12,
          fontFamily: FONT.heading,
          fontSize: 13,
          letterSpacing: 2.6,
          color: saved ? '#FFFFFF' : BRAND_PRIMARY,
        }}
      >
        {saved ? 'SAVED' : 'VISITED'}
      </Text>
      <View style={{ position: 'absolute', right: size * 0.12, bottom: size * 0.12 }}>
        <TpMark size={size * 0.24} color={saved ? '#FFFFFF' : BRAND_PRIMARY} />
      </View>
    </View>
  )
}
