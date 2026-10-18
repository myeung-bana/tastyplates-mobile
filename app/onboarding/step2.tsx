import { useCallback, useEffect, useRef, useState } from 'react'
import { View, type TextInput } from 'react-native'
import { useRouter } from 'expo-router'

import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard'
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { TextField } from '@/components/ui/TextField'
import { SCREEN_ONBOARDING, SCREEN_ONBOARDING_DISPLAY_NAME } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { loadOnboardingDraft, mergeOnboardingDraft } from '@/services/onboardingService'
import { fetchRestaurantUserById } from '@/services/restaurantUserService'

const NAME_MAX = 40

/** Step 2 of 5 — first and last name (design G5b). Both required; private. */
function NameStep(): JSX.Element {
  const router = useRouter()
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const lastNameRef = useRef<TextInput>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const draft = await loadOnboardingDraft()
      if (cancelled) return
      if (!draft.username?.trim()) {
        router.replace(SCREEN_ONBOARDING)
        return
      }
      let first = draft.first_name ?? ''
      let last = draft.last_name ?? ''
      // Returning accounts (e.g. a Google sign-up that left mid-way) may already have names saved.
      if (!first && !last && user?.id) {
        try {
          const row = await fetchRestaurantUserById(user.id)
          first = row.first_name ?? ''
          last = row.last_name ?? ''
        } catch {
          // Optional prefill only.
        }
      }
      if (cancelled) return
      setFirstName(first)
      setLastName(last)
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router, user?.id])

  const canContinue = hydrated && firstName.trim().length > 0 && lastName.trim().length > 0

  const onContinue = useCallback(async () => {
    if (!canContinue) return
    await mergeOnboardingDraft({ first_name: firstName.trim(), last_name: lastName.trim() })
    router.push(SCREEN_ONBOARDING_DISPLAY_NAME)
  }, [canContinue, firstName, lastName, router])

  return (
    <OnboardingScaffold
      step={2}
      title="What’s your name?"
      subtitle="Only used to build your display name. You choose what others see next."
      ctaDisabled={!canContinue}
      onCta={() => void onContinue()}
      onBack={() => router.back()}
    >
      <View style={{ gap: 16 }}>
        <TextField
          label="First name"
          placeholder="First name"
          value={firstName}
          onChangeText={setFirstName}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
          editable={hydrated}
        />
        <TextField
          ref={lastNameRef}
          label="Last name"
          placeholder="Last name"
          value={lastName}
          onChangeText={setLastName}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="done"
          onSubmitEditing={() => void onContinue()}
          editable={hydrated}
        />
      </View>
    </OnboardingScaffold>
  )
}

export default function OnboardingStep2(): JSX.Element {
  return (
    <OnboardingGuard>
      <NameStep />
    </OnboardingGuard>
  )
}
