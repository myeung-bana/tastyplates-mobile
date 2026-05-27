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
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type { User } from '@nhost/nhost-js'
import { useSignInEmailPassword } from '@nhost/react'
import { z } from 'zod'

import {
  BRAND_PRIMARY,
  mergeTextInputBodyTypography,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_FORGOT_PASSWORD } from '@/constants/screens'
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn'
import { loginScreenHref } from '@/lib/authRoutes'
import { toast } from '@/utils/toast'

/** Auth screen inputs — aligns with `_auth.scss` / design_system (16px avoids iOS zoom). */
const inputClass =
  'mb-1 rounded-[10px] border border-[#797979] bg-white px-4 py-3 text-base text-gray-900'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export type SignInSuccessPayload = {
  needsEmailVerification: boolean
  user: User | null
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
  const { continueWithGoogle, googleBusy } = useGoogleSignIn({ onSuccess: onSignInSuccess })

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
    })
  })

  const busy = isLoading

  const signUpFooter =
    embedded && onSwitchToSignUp ? (
      <View className="flex-row flex-wrap justify-center gap-1 pb-6">
        <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
          {"Don't have an account?"}
        </Text>
        <Pressable onPress={onSwitchToSignUp}>
          <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
            Sign up
          </Text>
        </Pressable>
      </View>
    ) : !embedded ? (
      <View className="flex-row flex-wrap justify-center gap-1 pb-6">
        <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
          {"Don't have an account?"}
        </Text>
        <Link href={loginScreenHref({ mode: 'signup', resume })} asChild>
          <Pressable>
            <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
              Sign up
            </Text>
          </Pressable>
        </Link>
      </View>
    ) : null

  const fields = (
    <>
      {showIntro ? (
        <Text className="mb-8 text-base leading-relaxed" style={{ color: TEXT_BODY }}>
          Sign in with your Tastyplates email and password.
        </Text>
      ) : null}

      <Text className="mb-1 text-sm font-medium" style={{ color: TEXT_HEADING }}>
        Email
      </Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Email Address"
            placeholderTextColor="#797979"
            value={value}
            className={inputClass}
            style={mergeTextInputBodyTypography()}
          />
        )}
      />
      {errors.email ? (
        <Text className="mb-4 text-sm text-red-600">{errors.email.message}</Text>
      ) : (
        <View className="mb-4" />
      )}

      <Text className="mb-1 text-sm font-medium" style={{ color: TEXT_HEADING }}>
        Password
      </Text>
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="••••••••"
            placeholderTextColor="#797979"
            secureTextEntry
            value={value}
            className={inputClass}
            style={mergeTextInputBodyTypography()}
          />
        )}
      />
      {errors.password ? (
        <Text className="mb-4 text-sm text-red-600">{errors.password.message}</Text>
      ) : (
        <View className="mb-2" />
      )}

      <Link href={SCREEN_FORGOT_PASSWORD} asChild>
        <Pressable className="mb-6 self-start py-1">
          <Text className="text-sm font-medium" style={{ color: TEXT_BODY }}>
            Forgot password?
          </Text>
        </Pressable>
      </Link>

      <Pressable
        accessibilityRole="button"
        disabled={busy || googleBusy}
        onPress={onSubmit}
        className="mb-8 items-center rounded-full py-4 active:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Log in</Text>
        )}
      </Pressable>

      {showGoogle ? (
        <>
          <View className="mb-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-gray-200" />
            <Text className="text-xs font-medium uppercase" style={{ color: TEXT_MUTED }}>
              or
            </Text>
            <View className="h-px flex-1 bg-gray-200" />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            disabled={busy || googleBusy}
            onPress={() => void continueWithGoogle()}
            className="mb-8 flex-row items-center justify-center gap-3 rounded-full border bg-white px-5 py-3.5 active:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: '#d1d5db', borderWidth: 1 }}
          >
            {googleBusy ? (
              <ActivityIndicator color={TEXT_HEADING} />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color="#4285F4" />
                <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>
        </>
      ) : null}

      {signUpFooter}
    </>
  )

  if (embedded) {
    return <View>{fields}</View>
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
