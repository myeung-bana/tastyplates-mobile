import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard'
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { TextField } from '@/components/ui/TextField'
import {
  BRAND_PRIMARY,
  DANGER,
  SUCCESS,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { getUsernameErrorMessage, usernameCheckError } from '@/constants/messages'
import { SCREEN_ONBOARDING_NAME } from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { userNameMaxLimit } from '@/constants/validation'
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

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'error'

function normalizeProfileUsername(raw: string | null | undefined): string {
  return raw?.trim().replace(/^@/, '').toLowerCase() ?? ''
}

const RULES = [
  '3–20 characters · letters, numbers, _ and -',
  'No spaces · can’t start or end with _ or -',
  'Not all numbers · no __, -- or _- in a row',
]

/** Step 1 of 5 — Choose Username (design G5). No back button. */
function UsernameStep(): JSX.Element {
  const router = useRouter()
  const { loading: authLoading, user } = useAuth()
  const [username, setUsername] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const profileUsernameRef = useRef('')
  const [availability, setAvailability] = useState<Availability>('idle')

  // Draft → existing username → generated user_<random>.
  useEffect(() => {
    if (!user?.id) {
      setHydrated(true)
      return
    }
    let cancelled = false
    void (async () => {
      const draft = await loadOnboardingDraft()
      try {
        const row = await fetchRestaurantUserById(user.id)
        if (cancelled) return
        const profileUsername = row.username?.trim().replace(/^@/, '') ?? ''
        profileUsernameRef.current = normalizeProfileUsername(profileUsername)
        setUsername(draft.username?.trim() || profileUsername || generateDefaultUsername())
      } catch {
        if (!cancelled) setUsername(draft.username?.trim() || generateDefaultUsername())
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const validation = useMemo(() => validateUsername(username), [username])
  const trimmed = username.trim()

  // Availability check after a pause, only once the name passes the local rules.
  useEffect(() => {
    if (!validation.isValid) {
      setAvailability('idle')
      return
    }
    if (profileUsernameRef.current && trimmed.toLowerCase() === profileUsernameRef.current) {
      setAvailability('available')
      return
    }
    let cancelled = false
    setAvailability('checking')
    const handle = setTimeout(() => {
      checkUsernameAvailable(trimmed)
        .then((ok) => {
          if (!cancelled) setAvailability(ok ? 'available' : 'taken')
        })
        .catch(() => {
          if (!cancelled) setAvailability('error')
        })
    }, 420)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [trimmed, validation.isValid])

  const message = useMemo((): { text: string; color: string } | null => {
    if (!hydrated || !trimmed) return null
    if (!validation.isValid && validation.error) {
      return { text: getUsernameErrorMessage(validation.error), color: DANGER }
    }
    if (availability === 'taken') return { text: `@${trimmed} is taken`, color: DANGER }
    if (availability === 'error') return { text: usernameCheckError, color: DANGER }
    if (availability === 'checking') return { text: 'Checking availability…', color: TEXT_TERTIARY }
    if (availability === 'available') return { text: `@${trimmed} is available`, color: SUCCESS }
    return null
  }, [availability, hydrated, trimmed, validation])

  const canContinue = validation.isValid && availability === 'available'

  const onContinue = useCallback(async () => {
    if (!validateUsername(username).isValid) return
    const isOwn =
      profileUsernameRef.current.length > 0 && trimmed.toLowerCase() === profileUsernameRef.current
    setSubmitting(true)
    try {
      if (!isOwn && !(await checkUsernameAvailable(trimmed))) {
        setAvailability('taken')
        return
      }
      await mergeOnboardingDraft({ username: trimmed })
      router.push(SCREEN_ONBOARDING_NAME)
    } catch {
      toast.error(usernameCheckError)
    } finally {
      setSubmitting(false)
    }
  }, [router, trimmed, username])

  const onDevSkip = useCallback(async () => {
    const generated = generateDefaultUsername()
    await mergeOnboardingDraft({ username: generated })
    router.push(SCREEN_ONBOARDING_NAME)
  }, [router])

  const borderColor =
    message?.color === SUCCESS ? SUCCESS : message?.color === DANGER ? DANGER : undefined

  return (
    <OnboardingScaffold
      step={1}
      title="Choose Username"
      subtitle="This is how people find you and your reviews."
      ctaDisabled={!canContinue || authLoading || !hydrated}
      ctaLoading={submitting}
      onCta={() => void onContinue()}
    >
      <TextField
        value={username}
        onChangeText={setUsername}
        editable={hydrated}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        maxLength={userNameMaxLimit + 4}
        accessibilityLabel="Username"
        height={56}
        borderColor={borderColor}
        style={{ fontSize: 17 }}
        prefix={
          <Text style={{ fontFamily: FONT.body, fontSize: 17, color: TEXT_TERTIARY }}>@</Text>
        }
      />
      <View style={{ minHeight: 28, justifyContent: 'center', marginTop: 4 }}>
        {message ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ fontFamily: FONT.bodyMedium, fontSize: 13, lineHeight: 18, color: message.color }}
          >
            {message.text}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          backgroundColor: SURFACE_FOG,
          gap: 6,
        }}
      >
        <Text
          style={{
            fontFamily: FONT.heading,
            fontSize: 11,
            lineHeight: 14,
            letterSpacing: 2.2,
            textTransform: 'uppercase',
            color: TEXT_HEADING,
          }}
        >
          Rules
        </Text>
        {RULES.map((rule) => (
          <Text key={rule} style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 18, color: TEXT_MUTED }}>
            {rule}
          </Text>
        ))}
      </View>

      {DEV_MODE ? (
        <Pressable accessibilityRole="button" onPress={() => void onDevSkip()} className="mt-6 items-center py-2">
          <Text style={{ fontFamily: FONT.body, fontSize: 14, color: BRAND_PRIMARY }}>
            DEV: Skip to step 2
          </Text>
        </Pressable>
      ) : null}
    </OnboardingScaffold>
  )
}

export default function OnboardingStep1(): JSX.Element {
  return (
    <OnboardingGuard>
      <UsernameStep />
    </OnboardingGuard>
  )
}
