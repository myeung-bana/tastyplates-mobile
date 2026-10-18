import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'

export const ONBOARDING_STEP_COUNT = 5

type Props = {
  step: number
  title: string
  subtitle?: string
  children: ReactNode
  ctaLabel?: string
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onCta: () => void
  /** Omitted on step 1 — the design has no back there. */
  onBack?: () => void
  /** Line above the footer buttons (e.g. "1 of 2 selected"). */
  footerNote?: string
  /** Put children in a ScrollView (default) or let them manage their own scrolling. */
  scroll?: boolean
  /** Divider above the footer — used when content scrolls under it. */
  footerBorder?: boolean
}

/** Brand v1.0 onboarding shell: 5-segment progress, eyebrow, title, footer CTA. */
export function OnboardingScaffold({
  step,
  title,
  subtitle,
  children,
  ctaLabel = 'Continue',
  ctaDisabled,
  ctaLoading,
  onCta,
  onBack,
  footerNote,
  scroll = true,
  footerBorder = false,
}: Props): JSX.Element {
  const insets = useSafeAreaInsets()

  const body = (
    <View className="px-6" style={{ paddingTop: 24 }}>
      {children}
    </View>
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: SURFACE_CARD }}
    >
      <View style={{ paddingTop: insets.top + 14 }} className="px-6">
        <View className="flex-row" style={{ gap: 6 }}>
          {Array.from({ length: ONBOARDING_STEP_COUNT }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i < step ? BRAND_PRIMARY : BORDER_SUBTLE,
              }}
            />
          ))}
        </View>
        <Text
          accessibilityRole="header"
          style={{
            marginTop: 10,
            fontFamily: FONT.heading,
            fontSize: 11,
            lineHeight: 14,
            letterSpacing: 2.2,
            textTransform: 'uppercase',
            color: TEXT_MUTED,
          }}
        >
          Step {step} of {ONBOARDING_STEP_COUNT}
        </Text>
        <Text
          style={{
            marginTop: 18,
            fontFamily: FONT.heading,
            fontSize: 28,
            lineHeight: 34,
            color: TEXT_HEADING,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              marginTop: 8,
              fontFamily: FONT.body,
              fontSize: 15,
              lineHeight: 22,
              color: TEXT_MUTED,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}

      <View
        className="px-6"
        style={{
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
          gap: 10,
          borderTopWidth: footerBorder ? 1 : 0,
          borderTopColor: BORDER_SUBTLE,
        }}
      >
        {footerNote ? (
          <Text
            className="text-center"
            style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_MUTED }}
          >
            {footerNote}
          </Text>
        ) : null}
        <View className="flex-row items-center" style={{ gap: 10 }}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous step"
              hitSlop={6}
              onPress={() => {
                void Haptics.selectionAsync()
                onBack()
              }}
              className="items-center justify-center active:opacity-80"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: BORDER_SUBTLE,
                backgroundColor: SURFACE_CARD,
              }}
            >
              <AppIcon name="chevron-left" size={20} color={TEXT_HEADING} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Button disabled={ctaDisabled} loading={ctaLoading} onPress={onCta}>
              {ctaLabel}
            </Button>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

/** Labelled 52px text field used across onboarding and profile forms. */
export function OnboardingFieldLabel({ children }: { children: string }): JSX.Element {
  return (
    <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING, marginBottom: 8 }}>
      {children}
    </Text>
  )
}
