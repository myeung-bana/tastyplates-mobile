import { useEffect } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Linking from 'expo-linking'
import { Link, useRouter } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useSignUpEmailPassword } from '@nhost/react'
import { z } from 'zod'

import { AuthScreenHeader } from '@/components/auth/AuthScreenHeader'
import { SCREEN_LOGIN, SCREEN_USER_VERIFICATION } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { navigateAfterAuth } from '@/lib/authNavigation'
import { toast } from '@/utils/toast'

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

export default function RegisterScreen() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isReady } = useSession()
  const { signUpEmailPassword, isLoading } = useSignUpEmailPassword()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!isReady || authLoading || !isAuthenticated || !user) return
    navigateAfterAuth(router, { needsEmailVerification: false, user })
  }, [isReady, authLoading, isAuthenticated, user, router])

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
    navigateAfterAuth(router, {
      needsEmailVerification: result.needsEmailVerification,
      user: result.user,
    })
  })

  const busy = isLoading || (isAuthenticated && authLoading)

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <AuthScreenHeader title="Create account" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="grow px-4 pb-8 pt-4"
        >
          <Text className="mb-6 text-base text-gray-600">
            Create a Tastyplates account. We will send a verification link to your email if required
            by your project settings.
          </Text>

          <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
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
                placeholderTextColor="#9ca3af"
                value={value}
                className="mb-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
              />
            )}
          />
          {errors.email ? (
            <Text className="mb-4 text-sm text-red-600">{errors.email.message}</Text>
          ) : (
            <View className="mb-4" />
          )}

          <Text className="mb-1 text-sm font-medium text-gray-700">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="At least 8 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={value}
                className="mb-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
              />
            )}
          />
          {errors.password ? (
            <Text className="mb-4 text-sm text-red-600">{errors.password.message}</Text>
          ) : (
            <View className="mb-4" />
          )}

          <Text className="mb-1 text-sm font-medium text-gray-700">Confirm password</Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Repeat password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={value}
                className="mb-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
              />
            )}
          />
          {errors.confirmPassword ? (
            <Text className="mb-6 text-sm text-red-600">{errors.confirmPassword.message}</Text>
          ) : (
            <View className="mb-6" />
          )}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onSubmit}
            className="mb-6 items-center rounded-xl bg-[#ff7c0a] py-4 active:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Sign up</Text>
            )}
          </Pressable>

          <View className="flex-row flex-wrap justify-center gap-1">
            <Text className="text-center text-sm text-gray-600">Already have an account?</Text>
            <Link href={SCREEN_LOGIN} asChild>
              <Pressable>
                <Text className="text-sm font-semibold text-[#ff7c0a]">Log in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
