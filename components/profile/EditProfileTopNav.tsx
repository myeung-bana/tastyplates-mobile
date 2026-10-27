import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { CircleIconButton } from '@/components/navigation/CircleIconButton'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'

/** Light orange for an inactive Done pill (brand v1.0 disabled CTA). */
const DONE_DISABLED = '#FFB070'

export interface EditProfileTopNavProps {
  onCancel: () => void
  onDone?: () => void
  doneEnabled?: boolean
  saving?: boolean
  /** Center title (defaults to “Edit profile”). */
  title?: string
  /**
   * `modal` (design P5 / P6) — underlined Cancel, Done as an orange pill, hairline below.
   * `push` (design P5d) — round back button, Done as dark-orange text.
   */
  variant?: 'modal' | 'push'
  /** Replaces Done (e.g. the "1/2" palate count on P6). */
  right?: ReactNode
}

export function EditProfileTopNav({
  onCancel,
  onDone,
  doneEnabled = true,
  saving = false,
  title = 'Edit profile',
  variant = 'modal',
  right,
}: EditProfileTopNavProps): JSX.Element {
  const insets = useSafeAreaInsets()
  const canDone = doneEnabled && !saving && Boolean(onDone)

  const handleDone = () => {
    if (!canDone) return
    void Haptics.selectionAsync()
    onDone?.()
  }

  const done =
    right ??
    (variant === 'modal' ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Done"
        accessibilityState={{ disabled: !canDone, busy: saving }}
        hitSlop={8}
        onPress={handleDone}
        disabled={!canDone}
        className="items-center justify-center active:opacity-80"
        style={{ height: 36, minWidth: 72, paddingHorizontal: 16, borderRadius: 999, backgroundColor: canDone || saving ? BRAND_PRIMARY : DONE_DISABLED }}
      >
        {saving ? (
          <ActivityIndicator size="small" color={TEXT_HEADING} />
        ) : (
          <Text style={{ fontFamily: FONT.heading, fontSize: 15, letterSpacing: 0.6, color: TEXT_HEADING }}>Done</Text>
        )}
      </Pressable>
    ) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Done"
        accessibilityState={{ disabled: !canDone }}
        hitSlop={8}
        onPress={handleDone}
        disabled={!canDone}
        className="items-end justify-center active:opacity-70"
        style={{ minWidth: 44, height: 44 }}
      >
        <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 16, color: canDone ? BRAND_PRIMARY_DARK : TEXT_TERTIARY }}>Done</Text>
      </Pressable>
    ))

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: SURFACE_CARD,
        borderBottomWidth: variant === 'modal' ? 1 : 0,
        borderBottomColor: BORDER_SUBTLE,
      }}
    >
      <View className="flex-row items-center justify-between" style={{ height: 52, paddingHorizontal: 16 }}>
        <View style={{ minWidth: 72, alignItems: 'flex-start' }}>
          {variant === 'push' ? (
            <CircleIconButton icon="chevron-left" accessibilityLabel="Back" onPress={onCancel} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              hitSlop={8}
              onPress={() => {
                void Haptics.selectionAsync()
                onCancel()
              }}
              disabled={saving}
              className="justify-center active:opacity-70"
              style={{ height: 44 }}
            >
              <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 15, color: TEXT_HEADING, textDecorationLine: 'underline' }}>
                Cancel
              </Text>
            </Pressable>
          )}
        </View>

        <Text accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1, fontFamily: FONT.heading, fontSize: 17, color: TEXT_HEADING }}>
          {title}
        </Text>

        <View style={{ minWidth: 72, alignItems: 'flex-end' }}>{done}</View>
      </View>
    </View>
  )
}
