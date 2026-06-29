import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/ui/AppIcon'
import { TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'

type AuthOverlayLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
  /** Back control on sign-in / sign-up (null on method chooser). */
  headerSlot?: ReactNode
  onClose: () => void
}

/** Full-screen white auth shell for the global login overlay. */
export function AuthOverlayLayout({
  title,
  subtitle,
  children,
  headerSlot,
  onClose,
}: AuthOverlayLayoutProps): JSX.Element {
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 8,
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
        }}
      >
        <View className="min-h-[40px] flex-row items-center justify-between">
          <View className="min-w-[72px] flex-1 items-start justify-center">
            {headerSlot ?? null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={onClose}
            className="p-1 active:opacity-70"
          >
            <AppIcon name="x" size={24} color={TEXT_HEADING} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
