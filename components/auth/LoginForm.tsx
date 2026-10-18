import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { Link } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type { User } from '@nhost/nhost-js'
import { useSignInEmailPassword } from '@nhost/react'
import { z } from 'zod'

import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { SCREEN_FORGOT_PASSWORD } from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn'
import { loginScreenHref } from '@/lib/authRoutes'
import { toast } from '@/utils/toast'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export type SignInSuccessPayload = {
  needsEmailVerification: boolean
  user: User | null
  email?: string
}

export type LoginFormProps = {
  /** Optional resume path echoed into “Sign up” link query. */
  resume?: string
  /** When false, omit the subtitle under the headings (parent shows context). */
  showIntro?: boolean
  /** When true, render fields only (parent provides scroll + keyboard avoidance). */
  embedded?: boolean
  /** When false, hide Google button (chooser screen provides Google). Default true. */
  showGoogle?: boolean
  /** Called after a successful `signInEmailPassword`. */
  onSignInSuccess: (payload: SignInSuccessPayload) => void | Promise<void>
  /** When embedded, switch to sign-up without router (optional). */
  onSwitchToSignUp?: () => void
}

export function LoginForm({
  resume,
  showIntro = true,
  embedded = false,
  showGoogle = true,
  onSignInSuccess,
  onSwitchToSignUp,
}: LoginFormProps) {
  const { signInEmailPassword, isLoading } = useSignInEmailPassword()
  const { continueWithGoogle, googleBusy } = useGoogleSignIn({
    onSuccess: (payload) =>
      onSignInSuccess({
        ...payload,
        email: payload.user?.email ?? undefined,
      }),
  })

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const result = await signInEmailPassword(email, password)
    if (result.isError && result.error) {
      toast.error(result.error.message ?? 'Could not sign in')
      return
    }
    await onSignInSuccess({
      needsEmailVerification: result.needsEmailVerification,
      user: result.user,
      email,
    })
  })

  const busy = isLoading

  const signUpFooter =
    embedded && onSwitchToSignUp ? (
      <View className="flex-row flex-wrap justify-center" style={{ gap: 4, paddingBottom: 12 }}>
        <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>New to Tastyplates?</Text>
        <Pressable onPress={onSwitchToSignUp} hitSlop={6}>
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY }}>Create account</Text>
        </Pressable>
      </View>
    ) : !embedded ? (
      <View className="flex-row flex-wrap justify-center" style={{ gap: 4, paddingBottom: 12 }}>
        <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>New to Tastyplates?</Text>
        <Link href={loginScreenHref({ mode: 'signup', resume })} asChild>
          <Pressable hitSlop={6}>
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY }}>Create account</Text>
          </Pressable>
        </Link>
      </View>
    ) : null

  const fields = (
    <View style={{ gap: 16 }}>
      {showIntro ? (
        <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: TEXT_MUTED }}>
          Sign in with your Tastyplates email and password.
        </Text>
      ) : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordField
            label="Password"
            autoComplete="password"
            textContentType="password"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.password?.message}
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />

      <Link href={SCREEN_FORGOT_PASSWORD} asChild>
        <Pressable className="self-start" hitSlop={6} style={{ paddingVertical: 2 }}>
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY_DARK }}>
            Forgot password?
          </Text>
        </Pressable>
      </Link>

      <Button loading={busy} disabled={googleBusy} onPress={() => void onSubmit()} style={{ marginTop: 8 }}>
        Sign in
      </Button>

      {showGoogle ? (
        <>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View style={{ height: 1, flex: 1, backgroundColor: BORDER_SUBTLE }} />
            <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 12, color: TEXT_TERTIARY, textTransform: 'uppercase' }}>
              or
            </Text>
            <View style={{ height: 1, flex: 1, backgroundColor: BORDER_SUBTLE }} />
          </View>
          <Button
            variant="secondary"
            loading={googleBusy}
            disabled={busy}
            onPress={() => void continueWithGoogle()}
            accessibilityLabel="Continue with Google"
          >
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <AppIcon name="logo-google" size={20} color="#4285F4" />
              <Text style={{ fontFamily: FONT.heading, fontSize: 17, letterSpacing: 0.6, color: TEXT_HEADING }}>
                Continue with Google
              </Text>
            </View>
          </Button>
        </>
      ) : null}

      {signUpFooter}
    </View>
  )

  if (embedded) {
    return fields
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="grow px-4 pb-8 pt-1"
      >
        {fields}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
