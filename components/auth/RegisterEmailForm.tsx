import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Linking from 'expo-linking'
import { Link } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type { User } from '@nhost/nhost-js'
import { useSignUpEmailPassword } from '@nhost/react'
import { z } from 'zod'

import { PasswordInput } from '@/components/ui/PasswordInput'
import {
  BRAND_PRIMARY,
  mergeTextInputBodyTypography,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import {
  SCREEN_PRIVACY_POLICY,
  SCREEN_TERMS_OF_SERVICE,
  SCREEN_USER_VERIFICATION,
} from '@/constants/screens'
import { loginScreenHref } from '@/lib/authRoutes'
import { toast } from '@/utils/toast'

const inputClass =
  'mb-1 rounded-[10px] border border-[#797979] bg-white px-4 py-3 text-base text-gray-900'

const registerSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export type RegisterSuccessPayload = {
  needsEmailVerification: boolean
  user: User | null
}

export type RegisterEmailFormProps = {
  /** Pass through from `/login` so “Log in” returns to same resume path. */
  resume?: string
  /** When false, parent shows intro copy in the hero sheet header. */
  showIntro?: boolean
  /** When true, hide footer log-in link unless `onSwitchToSignIn` is provided. */
  embedded?: boolean
  onRegisterSuccess: (payload: RegisterSuccessPayload) => void | Promise<void>
  /** When embedded, switch to sign-in without router (optional). */
  onSwitchToSignIn?: () => void
}

/**
 * Email + password registration (same flow as `/register`; used on unified login screen).
 */
export function RegisterEmailForm({
  resume,
  showIntro = true,
  embedded = false,
  onRegisterSuccess,
  onSwitchToSignIn,
}: RegisterEmailFormProps) {
  const { signUpEmailPassword, isLoading } = useSignUpEmailPassword()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const redirectTo = Linking.createURL(SCREEN_USER_VERIFICATION)
    const result = await signUpEmailPassword(email, password, {
      displayName: email.split('@')[0] ?? 'Food lover',
      redirectTo,
    })
    if (result.isError && result.error) {
      toast.error(result.error.message ?? 'Could not create account')
      return
    }
    await onRegisterSuccess({
      needsEmailVerification: result.needsEmailVerification,
      user: result.user,
    })
  })

  const busy = isLoading

  return (
    <View>
      {showIntro ? (
        <Text className="mb-6 text-center text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
          Create a free account to save favourites, write reviews, and follow other food lovers.
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
            placeholderTextColor="#9ca3af"
            value={value}
            className="mb-1 rounded-[10px] border border-[#797979] bg-white px-4 py-3 text-base text-gray-900"
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
          <PasswordInput
            autoComplete="new-password"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="At least 8 characters"
            placeholderTextColor="#9ca3af"
            value={value}
            className={inputClass}
          />
        )}
      />
      {errors.password ? (
        <Text className="mb-4 text-sm text-red-600">{errors.password.message}</Text>
      ) : (
        <View className="mb-4" />
      )}

      <Text className="mb-1 text-sm font-medium" style={{ color: TEXT_HEADING }}>
        Confirm password
      </Text>
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput
            autoComplete="new-password"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Repeat password"
            placeholderTextColor="#9ca3af"
            value={value}
            className={inputClass}
          />
        )}
      />
      {errors.confirmPassword ? (
        <Text className="mb-4 text-sm text-red-600">{errors.confirmPassword.message}</Text>
      ) : (
        <View className="mb-4" />
      )}

      <View className="mb-6 flex-row flex-wrap items-center justify-center gap-x-1 px-2">
        <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
          By signing up you agree to our
        </Text>
        <Link href={SCREEN_TERMS_OF_SERVICE} asChild>
          <Pressable>
            <Text
              className="text-center text-sm leading-relaxed underline"
              style={{ color: TEXT_BODY }}
            >
              Terms of Service
            </Text>
          </Pressable>
        </Link>
        <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
          and
        </Text>
        <Link href={SCREEN_PRIVACY_POLICY} asChild>
          <Pressable>
            <Text
              className="text-center text-sm leading-relaxed underline"
              style={{ color: TEXT_BODY }}
            >
              Privacy Policy
            </Text>
          </Pressable>
        </Link>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onSubmit}
        className="mb-6 items-center rounded-full py-4 active:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Sign up</Text>
        )}
      </Pressable>

      {embedded && onSwitchToSignIn ? (
        <View className="flex-row flex-wrap justify-center gap-1 pb-6">
          <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
            Already have an account?
          </Text>
          <Pressable onPress={onSwitchToSignIn}>
            <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
              Log in
            </Text>
          </Pressable>
        </View>
      ) : !embedded ? (
        <View className="flex-row flex-wrap justify-center gap-1 pb-6">
          <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
            Already have an account?
          </Text>
          <Link href={loginScreenHref({ mode: 'signin', resume })} asChild>
            <Pressable>
              <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
                Log in
              </Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
    </View>
  )
}
