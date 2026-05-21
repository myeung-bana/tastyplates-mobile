import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'

import { OnboardingLogo } from '@/components/onboarding/OnboardingLogo'
import { OnboardingStepIndicator } from '@/components/onboarding/OnboardingStepIndicator'
import { mergeTextInputBodyTypography } from '@/constants/brand'
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
import { toast } from '@/utils/toast'

export default function OnboardingStep1(): JSX.Element {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [username, setUsername] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>(
    'idle',
  )

  useEffect(() => {
    void loadOnboardingDraft().then((d) => {
      setUsername((d.username?.trim()?.length ?? 0) > 0 ? d.username!.trim() : generateDefaultUsername())
      setHydrated(true)
    })
  }, [])

  const validation = useMemo(() => validateUsername(username), [username])

  useEffect(() => {
    if (!validation.isValid) {
      setAvailability('idle')
      return
    }
    const trimmed = username.trim()
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

  const onContinue = useCallback(async () => {
    const v = validateUsername(username)
    if (!v.isValid) return
    const trimmed = username.trim()
    try {
      const ok = await checkUsernameAvailable(trimmed)
      if (!ok) {
        setAvailability('taken')
        return
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
          <Text className="text-center text-base text-gray-600">Verify your email before continuing.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const busy = authLoading || !hydrated

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="grow px-4 pb-8 pt-6" keyboardShouldPersistTaps="handled">
          <OnboardingLogo />
          <OnboardingStepIndicator currentStep={1} />

          <Text className="mb-2 text-lg font-semibold" style={{ color: '#31343F' }}>
            Choose a username
          </Text>
          <Text className="mb-6 text-base text-gray-600">
            This is how others find you on Tastyplates. You can change it later in settings.
          </Text>

          <Text className="mb-1 text-sm font-medium text-gray-700">Username</Text>
          <View className="mb-2 flex-row items-stretch overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            <View className="justify-center border-r border-gray-200 bg-gray-100 px-3">
              <Text className="text-base text-gray-700">@</Text>
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              onChangeText={setUsername}
              placeholder="yourname"
              placeholderTextColor="#9ca3af"
              value={username}
              style={mergeTextInputBodyTypography()}
              className="min-h-[48px] flex-1 px-4 py-3 text-base text-gray-900"
            />
          </View>

          <View className="mb-6 min-h-[22px]">
            {(usernameErrorText != null && usernameErrorText.length > 0) ? (
              <Text className="text-sm text-red-600">{usernameErrorText}</Text>
            ) : null}
            {validation.isValid && availability === 'checking' ? (
              <Text className="text-sm text-gray-500">Checking availability…</Text>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy || !continueEnabled}
            onPress={() => {
              void onContinue()
            }}
            className="mb-4 items-center rounded-xl bg-[#ff7c0a] py-4 active:opacity-90 disabled:opacity-50"
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
              className="items-center py-2"
            >
              <Text className="text-sm text-orange-600">DEV: Skip to step 2</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
