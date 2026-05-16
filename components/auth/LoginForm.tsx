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
import { Link } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type { User } from '@nhost/nhost-js'
import { useSignInEmailPassword } from '@nhost/react'
import { z } from 'zod'

import { BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_FORGOT_PASSWORD } from '@/constants/screens'
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
  /** Called after a successful `signInEmailPassword`. */
  onSignInSuccess: (payload: SignInSuccessPayload) => void | Promise<void>
}

export function LoginForm({
  resume,
  showIntro = true,
  onSignInSuccess,
}: LoginFormProps) {
  const { signInEmailPassword, isLoading } = useSignInEmailPassword()

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="grow px-4 pb-8 pt-1"
      >
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
              placeholder="you@example.com"
              placeholderTextColor="#797979"
              value={value}
              className={inputClass}
              style={{ fontSize: 16 }}
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
              style={{ fontSize: 16 }}
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
          disabled={busy}
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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
