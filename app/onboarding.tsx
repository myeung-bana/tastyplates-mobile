import { useMemo, useState } from 'react'
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
import { useMutation } from '@apollo/client'
import { useNhostClient, useUserData } from '@nhost/react'

import { AuthScreenHeader } from '@/components/auth/AuthScreenHeader'
import { COMPLETE_ONBOARDING } from '@/graphql/mutations/userMutations'
import { SCREEN_HOME, SCREEN_LOGIN } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/utils/toast'

const PALATE_OPTIONS = ['Japanese', 'Italian', 'Chinese', 'Mexican', 'Indian', 'French', 'Korean', 'Thai']

export default function OnboardingScreen() {
  const router = useRouter()
  const nhost = useNhostClient()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const user = useUserData()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [completeOnboarding, { loading: saving }] = useMutation(COMPLETE_ONBOARDING)

  const togglePalate = (label: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const mergedMetadata = useMemo(() => {
    const base =
      user?.metadata && typeof user.metadata === 'object'
        ? { ...(user.metadata as Record<string, unknown>) }
        : {}
    return {
      ...base,
      onboardingCompleted: true,
      palates: Array.from(selected),
    }
  }, [user?.metadata, selected])

  const onFinish = async () => {
    if (!user?.id) {
      toast.error('You need to be signed in to finish onboarding.')
      return
    }
    const name = displayName.trim() || user.displayName || 'Food lover'
    try {
      await completeOnboarding({
        variables: {
          userId: user.id,
          displayName: name,
          metadata: mergedMetadata,
        },
      })
      await nhost.auth.refreshSession()
      await router.replace(SCREEN_HOME)
      toast.success('Welcome to Tastyplates')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save profile'
      toast.error(message)
    }
  }

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  const busy = saving || authLoading

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <AuthScreenHeader title="Welcome" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="grow px-4 pb-8 pt-4">
          <Text className="mb-2 text-lg font-semibold text-[#31343F]">Set up your profile</Text>
          <Text className="mb-6 text-base text-gray-600">
            Choose a display name and the cuisines you care about most. You can change these later.
          </Text>

          <Text className="mb-1 text-sm font-medium text-gray-700">Display name</Text>
          <TextInput
            autoCorrect={false}
            onChangeText={setDisplayName}
            placeholder="How should we call you?"
            placeholderTextColor="#9ca3af"
            value={displayName}
            className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          />

          <Text className="mb-3 text-sm font-medium text-gray-700">Palates (pick any)</Text>
          <View className="mb-8 flex-row flex-wrap gap-2">
            {PALATE_OPTIONS.map((p) => {
              const on = selected.has(p)
              return (
                <Pressable
                  key={p}
                  onPress={() => togglePalate(p)}
                  className={`rounded-full border px-4 py-2 ${
                    on ? 'border-[#ff7c0a] bg-orange-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text className={`text-sm font-medium ${on ? 'text-[#ff7c0a]' : 'text-gray-700'}`}>
                    {p}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onFinish}
            className="items-center rounded-xl bg-[#ff7c0a] py-4 active:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Continue</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
