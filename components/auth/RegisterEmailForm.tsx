import { useRef, useState } from 'react'
import { Pressable, Text, View, type TextInput } from 'react-native'
import { Link } from 'expo-router'
import type { User } from '@nhost/nhost-js'

import { LegalConsentText } from '@/components/legal/LegalConsentText'
import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import {
  BRAND_PRIMARY,
  SUCCESS,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { SCREEN_USER_VERIFICATION } from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { minimumPassword } from '@/constants/validation'
import { storePendingVerificationEmail } from '@/lib/authProfileSetup'
import { loginScreenHref } from '@/lib/authRoutes'
import { signUpEmailPasswordDirect } from '@/lib/nhostAuthDirect'
import { toast } from '@/utils/toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type RegisterSuccessPayload = {
  needsEmailVerification: boolean
  user: User | null
  email: string
}

export type RegisterEmailFormProps = {
  /** Pass through from `/login` so “Log in” returns to same resume path. */
  resume?: string
  /** When true, hide footer log-in link unless `onSwitchToSignIn` is provided. */
  embedded?: boolean
  onRegisterSuccess: (payload: RegisterSuccessPayload) => void | Promise<void>
  /** When embedded, switch to sign-in without router (optional). */
  onSwitchToSignIn?: () => void
  /** Prefill (e.g. "Wrong email? Change it" from verification). */
  initialEmail?: string
}

function Check({ ok, label }: { ok: boolean; label: string }): JSX.Element {
  const color = ok ? SUCCESS : TEXT_TERTIARY
  return (
    <View className="flex-row items-center" style={{ gap: 6 }}>
      <AppIcon name={ok ? 'check-circle' : 'circle'} size={15} color={color} />
      <Text style={{ fontFamily: FONT.body, fontSize: 13, color }}>{label}</Text>
    </View>
  )
}

/**
 * Email sign-up (design G3). Password ≥ 9 and must match — the checks turn green as you type.
 * Display name starts as the part of the email before @; the username comes next in onboarding.
 */
export function RegisterEmailForm({
  resume,
  embedded = false,
  onRegisterSuccess,
  onSwitchToSignIn,
  initialEmail = '',
}: RegisterEmailFormProps): JSX.Element {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const passwordRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)

  const trimmedEmail = email.trim()
  const lengthOk = password.length >= minimumPassword
  const matchOk = password.length > 0 && password === confirm
  const emailOk = EMAIL_RE.test(trimmedEmail)
  const canCreate = emailOk && lengthOk && matchOk
  const displayNameSeed = trimmedEmail.split('@')[0] ?? ''

  const onSubmit = async (): Promise<void> => {
    if (!canCreate || busy) return
    setBusy(true)
    try {
      const result = await signUpEmailPasswordDirect(trimmedEmail, password, {
        displayName: trimmedEmail.split('@')[0] || 'Food lover',
        redirectPath: SCREEN_USER_VERIFICATION,
      })
      if (result.isError && result.error) {
        toast.error(result.error.message ?? 'Could not create account')
        return
      }
      // Sign-up often has no session until verified — keep the email so /user-verification can resend.
      await storePendingVerificationEmail(trimmedEmail)
      await onRegisterSuccess({
        needsEmailVerification: result.needsEmailVerification,
        user: result.user,
        email: trimmedEmail,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: 16 }}>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordField
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder={`At least ${minimumPassword} characters`}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <PasswordField
        ref={confirmRef}
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
      />
      <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
        <Check ok={lengthOk} label={`At least ${minimumPassword} characters`} />
        <Check ok={matchOk} label="Passwords match" />
      </View>

      <View style={{ gap: 12, marginTop: 12 }}>
        <Button disabled={!canCreate} loading={busy} onPress={() => void onSubmit()}>
          Create account
        </Button>
        <LegalConsentText />
        {displayNameSeed ? (
          <Text className="text-center" style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 18, color: TEXT_MUTED }}>
            Your display name starts as{' '}
            <Text style={{ fontFamily: FONT.bodySemibold, color: TEXT_HEADING }}>{displayNameSeed}</Text> — you’ll
            pick a username next.
          </Text>
        ) : null}
      </View>

      {embedded && onSwitchToSignIn ? (
        <View className="flex-row flex-wrap justify-center" style={{ gap: 4, paddingBottom: 12 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>Already have an account?</Text>
          <Pressable onPress={onSwitchToSignIn} hitSlop={6}>
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY }}>Sign in</Text>
          </Pressable>
        </View>
      ) : !embedded ? (
        <View className="flex-row flex-wrap justify-center" style={{ gap: 4, paddingBottom: 12 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>Already have an account?</Text>
          <Link href={loginScreenHref({ mode: 'signin', resume })} asChild>
            <Pressable hitSlop={6}>
              <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY }}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
    </View>
  )
}
