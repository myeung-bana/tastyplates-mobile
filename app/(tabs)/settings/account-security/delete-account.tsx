import { useCallback, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { useSignOut } from '@nhost/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { SettingsFormField } from '@/components/settings/SettingsFormField'
import { Button } from '@/components/ui/Button'
import {
  BORDER_SUBTLE,
  TEXT_BODY,
  TEXT_HEADING,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import { SCREEN_GET_STARTED, SCREEN_LOGIN } from '@/constants/screens'
import { getFloatingTabBarOccupiedHeight } from '@/constants/tabBar'
import { useAuth } from '@/hooks/useAuth'
import { resetToGetStartedLanding } from '@/lib/guestBrowse'
import { requestAccountDeletion } from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

const CONFIRM_WORD = 'DELETE'
const GRACE_DAYS = 30

const REMOVED = [
  'Your profile, username, bio, birthdate, gender and locations',
  'Your followers, following, likes, favourites and check-ins',
  'Your lists and every photo you uploaded',
  'Your sign-in details — you will be signed out on every device',
]

function Bullets({ items }: { items: string[] }): JSX.Element {
  return (
    <View className="mb-4 gap-1.5">
      {items.map((item) => (
        <Text key={item} className="text-sm leading-5 font-neusans" style={{ color: TEXT_BODY }}>
          {`\u2022  ${item}`}
        </Text>
      ))}
    </View>
  )
}

export default function DeleteAccountScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { signOut } = useSignOut()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmed = confirmText.trim().toUpperCase() === CONFIRM_WORD

  const runDeletion = useCallback(async () => {
    setDeleting(true)
    try {
      await requestAccountDeletion()
      await resetToGetStartedLanding()
      router.replace(SCREEN_GET_STARTED)
      await signOut()
      toast.success(`Account scheduled for deletion. Sign in within ${GRACE_DAYS} days to restore it.`)
    } catch {
      toast.error('Could not delete your account. Please try again.')
      setDeleting(false)
    }
  }, [router, signOut])

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete account?',
      `You will be signed out now. Your account is permanently deleted after ${GRACE_DAYS} days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void runDeletion() },
      ],
    )
  }, [runDeletion])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Delete Account" />
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
          <Text className="mb-3 text-base leading-6 font-neusans" style={{ color: TEXT_HEADING }}>
            Your account is hidden immediately and permanently deleted after {GRACE_DAYS} days. Sign
            back in before then to restore it.
          </Text>

          <Text className="mb-2 text-sm font-semibold font-neusans" style={{ color: TEXT_HEADING }}>
            What is deleted
          </Text>
          <Bullets items={REMOVED} />

          <Text className="mb-2 text-sm font-semibold font-neusans" style={{ color: TEXT_HEADING }}>
            What stays, anonymised
          </Text>
          <Bullets
            items={[
              'Review and comment text stays so restaurant scores remain accurate, shown as "Deleted user" with no link to you',
            ]}
          />

          <SettingsFormField label={`Type ${CONFIRM_WORD} to confirm`}>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
              placeholder={CONFIRM_WORD}
              accessibilityLabel={`Type ${CONFIRM_WORD} to confirm account deletion`}
              className="rounded-xl border px-4 py-3 font-neusans text-base"
              style={mergeTextInputBodyTypography({
                color: TEXT_HEADING,
                borderColor: BORDER_SUBTLE,
              })}
            />
          </SettingsFormField>

          <Button
            onPress={handleDelete}
            disabled={!confirmed}
            loading={deleting}
            style={{ backgroundColor: '#dc2626' }}
          >
            Delete my account
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
