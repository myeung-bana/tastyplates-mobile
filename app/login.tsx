import { useEffect, useMemo } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuthScreenHeader } from '@/components/auth/AuthScreenHeader'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm'
import { TEXT_HEADING } from '@/constants/brand'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { navigateAfterAuth } from '@/lib/authNavigation'
import { coerceResumeHref } from '@/lib/authRoutes'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

type AuthSegment = 'signin' | 'signup'

export default function LoginScreen() {
  const router = useRouter()
  const raw = useLocalSearchParams<{ resume?: string | string[]; mode?: string | string[] }>()
  const resume = firstParam(raw.resume)
  const modeParam = firstParam(raw.mode)

  const segment: AuthSegment = modeParam === 'signup' ? 'signup' : 'signin'

  const resumeForNav = useMemo(() => coerceResumeHref(resume), [resume])

  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isReady } = useSession()

  useEffect(() => {
    if (!isReady || authLoading || !isAuthenticated || !user) return
    navigateAfterAuth(router, { needsEmailVerification: false, user }, resumeForNav)
  }, [isReady, authLoading, isAuthenticated, user, router, resumeForNav])

  return (
    <SafeAreaView className="flex-1 bg-[#FCFCFC]" edges={['top', 'left', 'right']}>
      <AuthScreenHeader title="Account" showHomeButton={false} />

      <Text className="pb-2 pt-6 text-center text-2xl font-normal" style={{ color: TEXT_HEADING }}>
        {segment === 'signin' ? 'Welcome back' : 'Create an account'}
      </Text>

      {segment === 'signin' ? (
        <LoginForm
          resume={resume}
          showIntro={false}
          onSignInSuccess={async (payload) => {
            await navigateAfterAuth(
              router,
              {
                needsEmailVerification: payload.needsEmailVerification,
                user: payload.user,
              },
              resumeForNav,
            )
          }}
        />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow px-4 pb-8">
            <RegisterEmailForm
              resume={resume}
              onRegisterSuccess={async (payload) => {
                await navigateAfterAuth(
                  router,
                  {
                    needsEmailVerification: payload.needsEmailVerification,
                    user: payload.user,
                  },
                  resumeForNav,
                )
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}
