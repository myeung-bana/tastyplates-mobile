import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import { useNhostClient } from '@nhost/react'
import { AppIcon } from '@/components/ui/AppIcon'

import { OnboardingLogo } from '@/components/onboarding/OnboardingLogo'
import { OnboardingStepIndicator } from '@/components/onboarding/OnboardingStepIndicator'
import { palateLimit } from '@/constants/validation'
import { SCREEN_HOME, SCREEN_LOGIN } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { DEV_MODE } from '@/lib/devMode'
import { flattenPalateSlugOptions } from '@/lib/onboardingPalates'
import {
  clearOnboardingDraft,
  completeOnboardingProfile,
  loadOnboardingDraft,
  setOnboardingJustCompletedFlag,
  type OnboardingRegistrationDraft,
} from '@/services/onboardingService'
import { toast } from '@/utils/toast'

export default function OnboardingStep3(): JSX.Element {
  const router = useRouter()
  const nhost = useNhostClient()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [draft, setDraft] = useState<OnboardingRegistrationDraft | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadOnboardingDraft().then((d) => {
      if (!d.username?.trim()) {
        router.replace('/onboarding/step1')
        return
      }
      setDraft(d)
    })
  }, [router])

  const options = useMemo(() => flattenPalateSlugOptions(), [])

  const atLimit = selected.size >= palateLimit

  const togglePalate = useCallback(
    (key: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(key)) {
          next.delete(key)
          return next
        }
        if (next.size >= palateLimit) return next
        next.add(key)
        return next
      })
    },
    [],
  )

  const onDone = useCallback(async () => {
    if (!draft?.username?.trim()) return
    if (selected.size !== palateLimit) {
      toast.error(`Please select exactly ${palateLimit} palates.`)
      return
    }
    setSaving(true)
    try {
      await completeOnboardingProfile({
        username: draft.username.trim(),
        palates: Array.from(selected),
      })
      await clearOnboardingDraft()
      await setOnboardingJustCompletedFlag()
      await nhost.auth.refreshSession()
      router.replace(SCREEN_HOME)
      toast.success('Welcome to Tastyplates')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }, [draft?.username, nhost.auth, router, selected])

  const onDevSkip = useCallback(async () => {
    if (!draft?.username?.trim()) return
    const keys = flattenPalateSlugOptions()
      .slice(0, palateLimit)
      .map((x) => x.key)
    setSaving(true)
    try {
      await completeOnboardingProfile({
        username: draft.username.trim(),
        palates: keys,
      })
      await clearOnboardingDraft()
      await setOnboardingJustCompletedFlag()
      await nhost.auth.refreshSession()
      router.replace(SCREEN_HOME)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'DEV skip failed')
    } finally {
      setSaving(false)
    }
  }, [draft?.username, nhost.auth, router])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  if (!user?.emailVerified) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-gray-600">Verify your email before continuing.</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (draft == null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ff7c0a" />
        </View>
      </SafeAreaView>
    )
  }

  const busy = saving || authLoading
  const doneEnabled = selected.size === palateLimit && !busy

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerClassName="grow px-4 pb-10 pt-4">
        <View className="mb-2 flex-row items-center">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.back()
            }}
            hitSlop={8}
            className="mr-2 rounded-full p-1 active:bg-gray-100"
          >
            <AppIcon name="chevron-left" size={24} color="#374151" />
          </Pressable>
          <Text className="text-base font-medium text-gray-800">Back</Text>
        </View>

        <OnboardingLogo />
        <OnboardingStepIndicator currentStep={3} />

        <Text className="mb-2 text-lg font-semibold" style={{ color: '#31343F' }}>
          Pick your palates
        </Text>
        <Text className="mb-2 text-base text-gray-600">Choose exactly {palateLimit} cuisines you care about most.</Text>
        <Text className="mb-6 text-sm text-gray-500">
          {selected.size === 0
            ? `Pick ${palateLimit} options below.`
            : selected.size === 1
              ? 'Pick 1 more.'
              : "You're set — tap Done when ready."}
        </Text>

        <View className="mb-8 flex-row flex-wrap gap-2">
          {options.map((p) => {
            const on = selected.has(p.key)
            const dim = atLimit && !on
            return (
              <Pressable
                key={p.key}
                disabled={busy}
                onPress={() => {
                  togglePalate(p.key)
                }}
                className={`rounded-full border px-3 py-2 ${on ? 'border-[#ff7c0a] bg-orange-50' : 'border-gray-200 bg-white'}`}
                style={{ opacity: dim ? 0.4 : 1 }}
              >
                <Text className={`text-sm font-medium ${on ? 'text-[#ff7c0a]' : 'text-gray-800'}`}>
                  {p.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!doneEnabled}
          onPress={() => {
            void onDone()
          }}
          className="items-center rounded-xl bg-[#ff7c0a] py-4 active:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Done</Text>
          )}
        </Pressable>

        {DEV_MODE ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void onDevSkip()
            }}
            className="mt-4 items-center py-2"
          >
            <Text className="text-sm text-orange-600">DEV: Complete with first two cuisines</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
