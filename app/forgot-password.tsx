import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Stack, Link } from 'expo-router'
import * as Linking from 'expo-linking'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useResetPassword } from '@nhost/react'
import { z } from 'zod'

import { AuthHeroLayout } from '@/components/auth/AuthHeroLayout'
import { BRAND_PRIMARY, mergeTextInputBodyTypography } from '@/constants/brand'
import { SCREEN_LOGIN } from '@/constants/screens'
import { toast } from '@/utils/toast'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
})

type Form = z.infer<typeof schema>

const inputClass =
  'mb-1 rounded-[10px] border border-[#797979] bg-white px-4 py-3 text-base text-gray-900'

export default function ForgotPasswordScreen() {
  const { resetPassword, isLoading } = useResetPassword()
  const [sent, setSent] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    const redirectTo = Linking.createURL('/reset-password')
    const result = await resetPassword(email, { redirectTo })
    if (result.isError && result.error) {
      toast.error(result.error.message ?? 'Could not send reset email')
      return
    }
    setSent(true)
    toast.success('Check your email for a reset link')
  })

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthHeroLayout
        title="Forgot password?"
        subtitle={
          sent
            ? undefined
            : 'Enter your account email. We will send you a link to choose a new password.'
        }
      >
        {sent ? (
          <Text className="text-base leading-6 text-gray-700">
            If an account exists for that address, we sent a message with a link to reset your
            password. Open it on this device, then set a new password on the next screen.
          </Text>
        ) : (
          <>
            <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Email Address"
                  placeholderTextColor="#797979"
                  value={value}
                  style={mergeTextInputBodyTypography()}
                  className={inputClass}
                />
              )}
            />
            {errors.email ? (
              <Text className="mb-6 text-sm text-red-600">{errors.email.message}</Text>
            ) : (
              <View className="mb-6" />
            )}
            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={onSubmit}
              className="mb-8 items-center rounded-full py-4 active:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Send reset link</Text>
              )}
            </Pressable>
          </>
        )}

        <Link href={SCREEN_LOGIN} asChild>
          <Pressable className="self-center py-2">
            <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
              Back to log in
            </Text>
          </Pressable>
        </Link>
      </AuthHeroLayout>
    </>
  )
}
