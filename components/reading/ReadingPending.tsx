import { useEffect } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TpMark } from '@/components/brand/TpMark'
import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { BRAND_PRIMARY, SURFACE_CARD, TEXT_HEADING } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import type { ReadingStatus } from '@/services/readingService'

const STEPS = ['Gathering reviews', 'Finding your groups', 'Writing your reading'] as const

/** Which checklist step is running for a backend job status (earlier steps are done). */
function activeStep(status: ReadingStatus | null): number {
  if (status === 'grouping') return 1
  if (status === 'writing' || status === 'ready') return 2
  return 0
}

const RING = 112

/**
 * Reading — pending (full screen): blurred restaurant photo under a dark scrim, the TastyPlates
 * mark inside a spinning orange ring, and a checklist that follows the backend job status.
 */
export function ReadingPending({
  title,
  image,
  status,
  slow,
  onClose,
  onRetry,
}: {
  title: string
  image?: string | null
  status: ReadingStatus | null
  /** Past 25 seconds: offer Retry / Back. */
  slow: boolean
  onClose: () => void
  onRetry: () => void
}): JSX.Element {
  const insets = useSafeAreaInsets()
  const spin = useSharedValue(0)
  const step = activeStep(status)

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false)
    return () => cancelAnimation(spin)
  }, [spin])

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }))

  return (
    <View style={{ flex: 1, backgroundColor: TEXT_HEADING }}>
      {image ? <Image source={{ uri: image }} blurRadius={28} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,18,22,0.72)' }]} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        accessibilityHint="Your reading keeps going and will be ready next time"
        hitSlop={8}
        onPress={onClose}
        className="items-center justify-center active:opacity-80"
        style={{ position: 'absolute', top: insets.top + 8, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(252,252,252,0.16)' }}
      >
        <AppIcon name="x" size={20} color={SURFACE_CARD} />
      </Pressable>

      <View className="flex-1 items-center justify-center" style={{ paddingHorizontal: 32, gap: 28 }}>
        <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: RING / 2, borderWidth: 3, borderColor: 'rgba(255,124,9,0.18)', borderTopColor: BRAND_PRIMARY },
              ringStyle,
            ]}
          />
          <TpMark size={40} color={SURFACE_CARD} />
        </View>

        <Text accessibilityRole="header" style={{ textAlign: 'center', fontFamily: FONT.heading, fontSize: 24, lineHeight: 30, color: SURFACE_CARD }}>
          Reading {title} for you
        </Text>

        <View accessibilityLiveRegion="polite" style={{ alignSelf: 'stretch', gap: 14, paddingHorizontal: 12 }}>
          {STEPS.map((label, i) => {
            const done = i < step
            const running = i === step
            return (
              <View key={label} className="flex-row items-center" style={{ gap: 12, opacity: done || running ? 1 : 0.45 }}>
                <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                  {done ? (
                    <View className="items-center justify-center" style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND_PRIMARY }}>
                      <AppIcon name="check" size={13} color={SURFACE_CARD} />
                    </View>
                  ) : running ? (
                    <ActivityIndicator size="small" color={BRAND_PRIMARY} />
                  ) : (
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(252,252,252,0.5)' }} />
                  )}
                </View>
                <Text style={{ fontFamily: running ? FONT.bodySemibold : FONT.body, fontSize: 15, color: SURFACE_CARD }}>{label}</Text>
              </View>
            )
          })}
        </View>

        {slow ? (
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Text style={{ textAlign: 'center', fontFamily: FONT.bodyMedium, fontSize: 14, color: SURFACE_CARD }}>
              This is taking longer than usual
            </Text>
            <View className="flex-row" style={{ gap: 10 }}>
              <Button variant="secondary" onPress={onClose} style={{ flex: 1 }}>
                Back
              </Button>
              <Button onPress={onRetry} style={{ flex: 1 }}>
                Retry
              </Button>
            </View>
          </View>
        ) : null}
      </View>

      <Text
        style={{
          textAlign: 'center',
          paddingHorizontal: 32,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          fontFamily: FONT.body,
          fontSize: 12,
          color: 'rgba(252,252,252,0.7)',
        }}
      >
        Scores come from reviewers&apos; self-selected palates.
      </Text>
    </View>
  )
}
