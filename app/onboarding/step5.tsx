import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useNhostClient } from '@nhost/react'

import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard'
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { PalateIconGrid } from '@/components/onboarding/PalateIconGrid'
import { TextField } from '@/components/ui/TextField'
import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, TEXT_TERTIARY } from '@/constants/brand'
import {
  SCREEN_HOME,
  SCREEN_ONBOARDING,
  SCREEN_ONBOARDING_CITIES,
  SCREEN_ONBOARDING_NAME,
} from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { palateLimit } from '@/constants/validation'
import { DEV_MODE } from '@/lib/devMode'
import { buildDisplayName } from '@/lib/displayNameOptions'
import { locationValueToApiInput } from '@/lib/onboardingLocation'
import { flattenPalateSlugOptions } from '@/lib/onboardingPalates'
import {
  clearOnboardingDraft,
  completeOnboardingProfile,
  loadOnboardingDraft,
  setOnboardingJustCompletedFlag,
  type OnboardingRegistrationDraft,
} from '@/services/onboardingService'
import { toast } from '@/utils/toast'

/** Step 5 of 5 — exactly 2 cuisines (design G7). Done saves everything in one update. */
function PalateStep(): JSX.Element {
  const router = useRouter()
  const nhost = useNhostClient()
  const [draft, setDraft] = useState<OnboardingRegistrationDraft | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadOnboardingDraft().then((d) => {
      if (!d.username?.trim()) return router.replace(SCREEN_ONBOARDING)
      if (!d.first_name?.trim() || !d.last_name?.trim()) return router.replace(SCREEN_ONBOARDING_NAME)
      if (!d.current_location?.label?.trim() || !d.hometown_location) {
        return router.replace(SCREEN_ONBOARDING_CITIES)
      }
      setDraft(d)
    })
  }, [router])

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else if (next.size < palateLimit) next.add(key)
      return next
    })
  }, [])

  const submit = useCallback(
    async (palates: string[]) => {
      if (!draft?.username || !draft.current_location) return
      const current = locationValueToApiInput(draft.current_location)
      if (!current) {
        toast.error('Current city is missing. Go back to step 4.')
        return
      }
      const first = draft.first_name ?? ''
      const last = draft.last_name ?? ''
      setSaving(true)
      try {
        await completeOnboardingProfile({
          username: draft.username,
          first_name: first,
          last_name: last,
          display_name: buildDisplayName(first, last, draft.display_name_variant ?? 'full'),
          palates,
          current_location: current,
          hometown: draft.hometown_location ? locationValueToApiInput(draft.hometown_location) : null,
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
    },
    [draft, nhost.auth, router],
  )

  const done = selected.size === palateLimit

  return (
    <OnboardingScaffold
      step={5}
      title={`Select ${palateLimit} cuisines you grew up with`}
      subtitle="These set the group score you see on every restaurant."
      ctaLabel="Done"
      ctaDisabled={!done || !draft}
      ctaLoading={saving}
      onCta={() => void submit(Array.from(selected))}
      onBack={() => router.back()}
      footerNote={`${selected.size} of ${palateLimit} selected`}
      footerBorder
      scroll={false}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 22 }}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search cuisines"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            height={46}
            accessibilityLabel="Search cuisines"
            prefix={<AppIcon name="search" size={18} color={TEXT_TERTIARY} style={{ marginRight: 8 }} />}
          />
        </View>
        <PalateIconGrid selected={selected} onToggle={toggle} query={query} disabled={saving} />
        {DEV_MODE ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              void submit(flattenPalateSlugOptions().slice(0, palateLimit).map((x) => x.key))
            }
            className="mt-6 items-center py-2"
          >
            <Text style={{ fontFamily: FONT.body, fontSize: 14, color: BRAND_PRIMARY }}>
              DEV: Complete with first two cuisines
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </OnboardingScaffold>
  )
}

export default function OnboardingStep5(): JSX.Element {
  return (
    <OnboardingGuard>
      <PalateStep />
    </OnboardingGuard>
  )
}
