import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'expo-router'

import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard'
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { DisplayNameOptionList } from '@/components/profile/DisplayNameOptionList'
import {
  SCREEN_ONBOARDING,
  SCREEN_ONBOARDING_CITIES,
  SCREEN_ONBOARDING_NAME,
} from '@/constants/screens'
import type { DisplayNameVariant } from '@/lib/displayNameOptions'
import {
  loadOnboardingDraft,
  mergeOnboardingDraft,
  type OnboardingRegistrationDraft,
} from '@/services/onboardingService'

/** Step 3 of 5 — pick which form of the name others see (design G5c). Default: full name. */
function DisplayNameStep(): JSX.Element {
  const router = useRouter()
  const [draft, setDraft] = useState<OnboardingRegistrationDraft | null>(null)
  const [variant, setVariant] = useState<DisplayNameVariant>('full')

  useEffect(() => {
    void loadOnboardingDraft().then((d) => {
      if (!d.username?.trim()) {
        router.replace(SCREEN_ONBOARDING)
        return
      }
      if (!d.first_name?.trim() || !d.last_name?.trim()) {
        router.replace(SCREEN_ONBOARDING_NAME)
        return
      }
      setVariant(d.display_name_variant ?? 'full')
      setDraft(d)
    })
  }, [router])

  const onContinue = useCallback(async () => {
    await mergeOnboardingDraft({ display_name_variant: variant })
    router.push(SCREEN_ONBOARDING_CITIES)
  }, [router, variant])

  return (
    <OnboardingScaffold
      step={3}
      title="Choose your display name"
      subtitle="This is the name people see on your reviews and profile."
      ctaDisabled={!draft}
      onCta={() => void onContinue()}
      onBack={() => router.back()}
    >
      {draft ? (
        <DisplayNameOptionList
          firstName={draft.first_name ?? ''}
          lastName={draft.last_name ?? ''}
          value={variant}
          onChange={setVariant}
          username={draft.username ?? ''}
        />
      ) : null}
    </OnboardingScaffold>
  )
}

export default function OnboardingStep3(): JSX.Element {
  return (
    <OnboardingGuard>
      <DisplayNameStep />
    </OnboardingGuard>
  )
}
