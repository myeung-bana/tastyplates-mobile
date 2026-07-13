import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import { useNhostClient } from '@nhost/react'

import { OnboardingTopNav } from '@/components/onboarding/OnboardingTopNav'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { palateLimit } from '@/constants/validation'
import { SCREEN_HOME, SCREEN_LOGIN } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { DEV_MODE } from '@/lib/devMode'
import { flattenPalateSlugOptions } from '@/lib/onboardingPalates'
import { locationValueToApiInput } from '@/lib/onboardingLocation'
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
      if (!d.current_location?.label?.trim()) {
        router.replace('/onboarding/step2')
        return
      }
      setDraft(d)
    })
  }, [router])

  const options = useMemo(() => flattenPalateSlugOptions(), [])

  const atLimit = selected.size >= palateLimit

  const togglePalate = useCallback((key: string) => {
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
  }, [])

  const submitProfile = useCallback(
    async (palates: string[]) => {
      if (!draft?.username?.trim() || !draft.current_location) return

      const currentApi = locationValueToApiInput(draft.current_location)
      if (!currentApi) {
        toast.error('Current location is missing. Go back to step 2.')
        return
      }

      const hometownApi =
        draft.hometown_location != null
          ? locationValueToApiInput(draft.hometown_location)
          : null

      await completeOnboardingProfile({
        username: draft.username.trim(),
        palates,
        current_location: currentApi,
        hometown: hometownApi,
      })
      await clearOnboardingDraft()
      await setOnboardingJustCompletedFlag()
      await nhost.auth.refreshSession()
      router.replace(SCREEN_HOME)
    },
    [draft, nhost.auth, router],
  )

  const onDone = useCallback(async () => {
    if (!draft?.username?.trim()) return
    if (selected.size !== palateLimit) {
      toast.error(`Please select exactly ${palateLimit} palates.`)
      return
    }
    setSaving(true)
    try {
      await submitProfile(Array.from(selected))
      toast.success('Welcome to Tastyplates')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }, [draft?.username, selected, submitProfile])

  const onDevSkip = useCallback(async () => {
    if (!draft?.username?.trim()) return
    const keys = flattenPalateSlugOptions()
      .slice(0, palateLimit)
      .map((x) => x.key)
    setSaving(true)
    try {
      await submitProfile(keys)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'DEV skip failed')
    } finally {
      setSaving(false)
    }
  }, [draft?.username, submitProfile])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  if (!user?.emailVerified) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base" style={{ color: TEXT_MUTED }}>
            Verify your email before continuing.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (draft == null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      </SafeAreaView>
    )
  }

  const busy = saving || authLoading
  const doneEnabled = selected.size === palateLimit && !busy

  return (
    <View className="flex-1 bg-white">
      <OnboardingTopNav title="Select Palate" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="grow px-5 pb-10 pt-6">
        <Text className="mb-2 text-lg font-semibold" style={{ color: TEXT_HEADING }}>
          Pick your palates
        </Text>
        <Text className="mb-2 text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
          Choose exactly {palateLimit} cuisines you care about most.
        </Text>
        <Text className="mb-6 text-sm" style={{ color: TEXT_MUTED }}>
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
                onPress={() => togglePalate(p.key)}
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
          className="items-center rounded-xl py-4 active:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND_PRIMARY }}
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
    </View>
  )
}
