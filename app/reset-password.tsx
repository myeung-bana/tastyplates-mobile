import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useAuthenticated, useChangePassword } from '@nhost/react'
import { z } from 'zod'

import { AuthHeroLayout } from '@/components/auth/AuthHeroLayout'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { BRAND_PRIMARY } from '@/constants/brand'
import { SCREEN_HOME, SCREEN_LOGIN } from '@/constants/screens'
import { toast } from '@/utils/toast'

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type Form = z.infer<typeof schema>

const inputClass =
  'mb-1 rounded-[10px] border border-[#797979] bg-white px-4 py-3 text-base text-gray-900'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const isAuthenticated = useAuthenticated()
  const { changePassword, isLoading } = useChangePassword()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  const onSubmit = handleSubmit(async ({ password }) => {
    const result = await changePassword(password)
    if (result.isError && result.error) {
      toast.error(result.error.message ?? 'Could not update password')
      return
    }
    toast.success('Password updated')
    router.replace(SCREEN_HOME)
  })

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthHeroLayout
        title="Set a new password"
        subtitle={
          isAuthenticated
            ? 'Signed in from your reset link. Choose a new password below.'
            : 'After you tap the link in your reset email, this app opens with an active session.'
        }
      >
        {!isAuthenticated ? (
          <Pressable onPress={() => router.replace(SCREEN_LOGIN)} className="self-start py-2">
            <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
              Go to log in
            </Text>
          </Pressable>
        ) : (
          <>
            <Text className="mb-1 text-sm font-medium text-gray-700">New password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  autoComplete="new-password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#797979"
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

            <Text className="mb-1 text-sm font-medium text-gray-700">Confirm password</Text>
            <Controller
              control={control}
              name="confirm"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  autoComplete="new-password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Repeat new password"
                  placeholderTextColor="#797979"
                  value={value}
                  className={inputClass}
                />
              )}
            />
            {errors.confirm ? (
              <Text className="mb-6 text-sm text-red-600">{errors.confirm.message}</Text>
            ) : (
              <View className="mb-6" />
            )}

            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={onSubmit}
              className="items-center rounded-full py-4 active:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Update password</Text>
              )}
            </Pressable>
          </>
        )}
      </AuthHeroLayout>
    </>
  )
}
