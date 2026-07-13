import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'

import { OnboardingTopNav } from '@/components/onboarding/OnboardingTopNav'
import { OnboardingUsernameField } from '@/components/onboarding/OnboardingUsernameField'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import {
  getUsernameErrorMessage,
  usernameCheckError,
  usernameNotAvailable,
} from '@/constants/messages'
import { SCREEN_LOGIN } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { DEV_MODE } from '@/lib/devMode'
import { validateUsername } from '@/lib/validation/username'
import {
  checkUsernameAvailable,
  generateDefaultUsername,
  loadOnboardingDraft,
  mergeOnboardingDraft,
} from '@/services/onboardingService'
import { fetchRestaurantUserById } from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

function normalizeProfileUsername(raw: string | null | undefined): string {
  return raw?.trim().replace(/^@/, '').toLowerCase() ?? ''
}

export default function OnboardingStep1(): JSX.Element {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [username, setUsername] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const profileUsernameRef = useRef('')
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>(
    'idle',
  )

  useEffect(() => {
    if (!user?.id) {
      setHydrated(true)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const draft = await loadOnboardingDraft()
        const row = await fetchRestaurantUserById(user.id)
        if (cancelled) return

        const profileUsername = row.username?.trim().replace(/^@/, '') ?? ''
        profileUsernameRef.current = normalizeProfileUsername(profileUsername)

        const initial =
          draft.username?.trim() ||
          profileUsername ||
          generateDefaultUsername()

        setUsername(initial)
      } catch {
        if (!cancelled) {
          const draft = await loadOnboardingDraft()
          setUsername(draft.username?.trim() || generateDefaultUsername())
        }
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const validation = useMemo(() => validateUsername(username), [username])

  useEffect(() => {
    if (!validation.isValid) {
      setAvailability('idle')
      return
    }

    const trimmed = username.trim()
    const trimmedLower = trimmed.toLowerCase()

    if (profileUsernameRef.current && trimmedLower === profileUsernameRef.current) {
      setAvailability('available')
      return
    }

    let cancelled = false
    setAvailability('checking')
    const handle = globalThis.setTimeout(() => {
      void (async () => {
        try {
          const ok = await checkUsernameAvailable(trimmed)
          if (!cancelled) {
            setAvailability(ok ? 'available' : 'taken')
          }
        } catch {
          if (!cancelled) setAvailability('error')
        }
      })()
    }, 420)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [username, validation.isValid])

  const continueEnabled = useMemo(() => {
    if (!validation.isValid) return false
    if (availability === 'checking' || availability === 'idle') return false
    return availability === 'available'
  }, [availability, validation.isValid])

  const usernameErrorText = useMemo(() => {
    if (!validation.isValid && validation.error) {
      return getUsernameErrorMessage(validation.error)
    }
    if (validation.isValid && availability === 'taken') return usernameNotAvailable
    if (availability === 'error') return usernameCheckError
    return null
  }, [availability, validation])

  const usernameStatusText = useMemo(() => {
    if (usernameErrorText) return null
    if (validation.isValid && availability === 'checking') return 'Checking availability…'
    if (validation.isValid && availability === 'available') return 'Username is available'
    return null
  }, [availability, usernameErrorText, validation.isValid])

  const onContinue = useCallback(async () => {
    const v = validateUsername(username)
    if (!v.isValid) return
    const trimmed = username.trim()
    const isOwn =
      profileUsernameRef.current.length > 0 &&
      trimmed.toLowerCase() === profileUsernameRef.current

    try {
      if (!isOwn) {
        const ok = await checkUsernameAvailable(trimmed)
        if (!ok) {
          setAvailability('taken')
          return
        }
      }
      await mergeOnboardingDraft({ username: trimmed })
      router.push('/onboarding/step2')
    } catch {
      toast.error(usernameCheckError)
    }
  }, [router, username])

  const onDevSkip = useCallback(async () => {
    const u = generateDefaultUsername()
    await mergeOnboardingDraft({ username: u })
    setUsername(u)
    router.push('/onboarding/step2')
  }, [router])

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

  const busy = authLoading || !hydrated

  return (
    <View className="flex-1 bg-white">
      <OnboardingTopNav title="Choose Username" showBack={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="grow px-5 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-2 text-lg font-semibold" style={{ color: TEXT_HEADING }}>
            Choose a username
          </Text>
          <Text className="mb-6 text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
            This is how others find you on Tastyplates. You can change it later in settings.
          </Text>

          <OnboardingUsernameField
            value={username}
            onChangeText={setUsername}
            editable={!busy}
            errorText={usernameErrorText}
            statusText={usernameStatusText}
          />

          <Pressable
            accessibilityRole="button"
            disabled={busy || !continueEnabled}
            onPress={() => {
              void onContinue()
            }}
            className="mt-6 items-center rounded-xl py-4 active:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Continue</Text>
            )}
          </Pressable>

          {DEV_MODE ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void onDevSkip()
              }}
              className="mt-4 items-center py-2"
            >
              <Text className="text-sm text-orange-600">DEV: Skip to step 2</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
