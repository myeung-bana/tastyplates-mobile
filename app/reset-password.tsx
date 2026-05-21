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
import { useRouter } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useAuthenticated, useChangePassword } from '@nhost/react'
import { z } from 'zod'

import { AuthScreenHeader } from '@/components/auth/AuthScreenHeader'
import { mergeTextInputBodyTypography } from '@/constants/brand'
import { SCREEN_HOME, SCREEN_LOGIN } from '@/constants/screens'
import { toast } from '@/utils/toast'

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type Form = z.infer<typeof schema>

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
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <AuthScreenHeader title="New password" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="grow px-4 pb-8 pt-4">
          {!isAuthenticated ? (
            <>
              <Text className="mb-4 text-base leading-6 text-gray-700">
                After you tap the link in your reset email, this app opens with an active session. Then
                choose a new password below.
              </Text>
              <Pressable onPress={() => router.replace(SCREEN_LOGIN)} className="self-start py-2">
                <Text className="text-sm font-semibold text-[#ff7c0a]">Go to log in</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="mb-6 text-base text-gray-600">
                Signed in from your reset link. Set a new password.
              </Text>
              <Text className="mb-1 text-sm font-medium text-gray-700">New password</Text>
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
                    style={mergeTextInputBodyTypography()}
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
                name="confirm"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="new-password"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Repeat new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={value}
                    style={mergeTextInputBodyTypography()}
                    className="mb-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
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
                className="items-center rounded-xl bg-[#ff7c0a] py-4 active:opacity-90 disabled:opacity-50"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-semibold text-white">Update password</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
