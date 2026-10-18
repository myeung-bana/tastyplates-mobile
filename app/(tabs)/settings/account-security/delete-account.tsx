import { useCallback, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { useSignOut } from '@nhost/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import {
  BORDER_SUBTLE,
  DANGER,
  SURFACE_CARD,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_GET_STARTED, SCREEN_LOGIN } from '@/constants/screens'
import { getFloatingTabBarOccupiedHeight } from '@/constants/tabBar'
import { FONT } from '@/constants/typography'
import { useAuth } from '@/hooks/useAuth'
import { resetToGetStartedLanding } from '@/lib/guestBrowse'
import { requestAccountDeletion } from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

/** Case-sensitive (design D1). */
const CONFIRM_WORD = 'DELETE'
const GRACE_DAYS = 30

const DELETED: { icon: AppIconName; label: string }[] = [
  { icon: 'user', label: 'Profile, photos and email' },
  { icon: 'log-out', label: 'Sign-in and sessions' },
  { icon: 'heart', label: 'Follows, likes and favourites' },
  { icon: 'map-pin', label: 'Check-ins and lists' },
]

function formatDeletionDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Group({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: FONT.heading, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}>
        {title}
      </Text>
      <View style={{ borderRadius: 14, backgroundColor: SURFACE_FOG, paddingHorizontal: 14, paddingVertical: 4 }}>{children}</View>
    </View>
  )
}

function Item({ icon, label, last = false }: { icon: AppIconName; label: string; last?: boolean }): JSX.Element {
  return (
    <View
      className="flex-row items-center"
      style={{ gap: 12, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: BORDER_SUBTLE }}
    >
      <AppIcon name={icon} size={16} color={TEXT_HEADING} />
      <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, color: TEXT_HEADING }}>{label}</Text>
    </View>
  )
}

/** Settings → Account Security → Delete Account (design D1 → D2 → D3). */
export default function DeleteAccountScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { signOut } = useSignOut()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmed = confirmText === CONFIRM_WORD

  const runDeletion = useCallback(async () => {
    setDeleting(true)
    try {
      const result = await requestAccountDeletion()
      const scheduledFor =
        result.scheduled_for ?? new Date(Date.now() + GRACE_DAYS * 86_400_000).toISOString()
      await resetToGetStartedLanding()
      // Get Started shows the one-time "scheduled for deletion" toast (design D3).
      router.replace({ pathname: SCREEN_GET_STARTED, params: { deletionScheduledFor: scheduledFor } })
      await signOut()
    } catch {
      toast.error('Could not delete your account. Please try again.')
      setDeleting(false)
    }
  }, [router, signOut])

  const handleDelete = useCallback(() => {
    const date = formatDeletionDate(new Date(Date.now() + GRACE_DAYS * 86_400_000))
    Alert.alert(
      'Delete your account?',
      `It’s hidden now and permanently deleted on ${date}. Sign in before then to restore it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void runDeletion() },
      ],
    )
  }, [runDeletion])

  if (!authLoading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
      <ReviewDetailTopNav title="Delete Account" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarOccupiedHeight(insets) + 24,
            gap: 20,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 28, lineHeight: 34, color: TEXT_HEADING }}>
              Delete your account?
            </Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: TEXT_MUTED }}>
              Your account is hidden right away. Sign back in within {GRACE_DAYS} days to restore it — after that,
              it’s permanent.
            </Text>
          </View>

          <Group title="Deleted">
            {DELETED.map((d, i) => (
              <Item key={d.label} icon={d.icon} label={d.label} last={i === DELETED.length - 1} />
            ))}
          </Group>

          <Group title="Kept, anonymised">
            <Item icon="message-square" label="Review and comment text, shown as “Deleted user”" last />
          </Group>

          <TextField
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
            placeholder={CONFIRM_WORD}
            borderColor={confirmed ? DANGER : undefined}
            accessibilityLabel={`Type ${CONFIRM_WORD} to confirm account deletion`}
          />

          <Button variant="danger" onPress={handleDelete} disabled={!confirmed} loading={deleting}>
            Delete account
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
