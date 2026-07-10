import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BirthdateField } from '@/components/settings/BirthdateField'
import { GenderPickerField } from '@/components/settings/GenderPickerField'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { SettingsFormFooter } from '@/components/settings/SettingsFormFooter'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import {
  BORDER_SUBTLE,
  TEXT_HEADING,
  TEXT_MUTED,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import {
  birthdateLimit,
  birthdateRequired,
  genderRequired,
  profileSettingsUpdated,
  profileUpdateFailed,
} from '@/constants/messages'
import { SCREEN_LOGIN } from '@/constants/screens'
import { ageLimit } from '@/constants/validation'
import { getFloatingTabBarOccupiedHeight } from '@/constants/tabBar'
import { useAuth } from '@/hooks/useAuth'
import {
  computeAge,
  formatBirthdateForApi,
  parseBirthdateString,
} from '@/lib/formatBirthdate'
import {
  fetchRestaurantUserById,
  updateRestaurantUserProfile,
} from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

type FormSnapshot = {
  birthdate: Date | null
  gender: string
}

export default function AccountProfileSettingsScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isAuthenticated, loading: authLoading, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [birthdate, setBirthdate] = useState<Date | null>(null)
  const [gender, setGender] = useState('')
  const [birthdateError, setBirthdateError] = useState<string | null>(null)
  const [genderError, setGenderError] = useState<string | null>(null)

  const initialRef = useRef<FormSnapshot | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void (async () => {
      try {
        const profile = await fetchRestaurantUserById(user.id)
        if (cancelled) return

        const parsedBirthdate = profile.birthdate
          ? parseBirthdateString(profile.birthdate)
          : null
        const nextGender = profile.gender?.trim() ?? ''

        setBirthdate(parsedBirthdate)
        setGender(nextGender)
        initialRef.current = { birthdate: parsedBirthdate, gender: nextGender }
      } catch {
        if (!cancelled) toast.error(profileUpdateFailed)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  const validate = useCallback((): boolean => {
    let valid = true

    if (!birthdate) {
      setBirthdateError(birthdateRequired)
      valid = false
    } else if (computeAge(birthdate) < ageLimit) {
      setBirthdateError(birthdateLimit(ageLimit))
      valid = false
    } else {
      setBirthdateError(null)
    }

    if (!gender.trim()) {
      setGenderError(genderRequired)
      valid = false
    } else {
      setGenderError(null)
    }

    return valid
  }, [birthdate, gender])

  const handleCancel = useCallback(() => {
    const initial = initialRef.current
    if (initial) {
      setBirthdate(initial.birthdate)
      setGender(initial.gender)
    }
    setBirthdateError(null)
    setGenderError(null)
    router.back()
  }, [router])

  const handleSave = useCallback(async () => {
    if (!user?.id || !validate()) return

    setSaving(true)
    try {
      await updateRestaurantUserProfile({
        birthdate: formatBirthdateForApi(birthdate!),
        gender: gender.trim(),
      })
      initialRef.current = { birthdate, gender: gender.trim() }
      toast.success(profileSettingsUpdated)
      router.back()
    } catch {
      toast.error(profileUpdateFailed)
    } finally {
      setSaving(false)
    }
  }, [birthdate, gender, router, user?.id, validate])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Profile" />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={TEXT_HEADING} />
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: getFloatingTabBarOccupiedHeight(insets) + 24,
            }}
          >
            <SettingsFormField
              label="Email Address"
              helper="Email is tied to your account authentication and cannot be changed here"
            >
              <TextInput
                editable={false}
                value={user?.email ?? ''}
                className="rounded-xl border px-4 py-3 font-neusans text-base"
                style={mergeTextInputBodyTypography({
                  color: TEXT_HEADING,
                  borderColor: BORDER_SUBTLE,
                  backgroundColor: '#f9fafb',
                })}
              />
            </SettingsFormField>

            <SettingsFormField label="Date of Birth" error={birthdateError}>
              <BirthdateField
                value={birthdate}
                onChange={(date) => {
                  setBirthdate(date)
                  if (birthdateError) setBirthdateError(null)
                }}
                disabled={saving}
                error={!!birthdateError}
              />
            </SettingsFormField>

            <SettingsFormField label="Gender" error={genderError}>
              <GenderPickerField
                value={gender}
                onChange={(next) => {
                  setGender(next)
                  if (genderError) setGenderError(null)
                }}
                disabled={saving}
                error={!!genderError}
              />
            </SettingsFormField>

            <SettingsFormFooter
              onCancel={handleCancel}
              onSave={() => void handleSave()}
              saving={saving}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  )
}
