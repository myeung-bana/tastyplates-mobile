import { useEffect, useMemo } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuthScreenHeader } from '@/components/auth/AuthScreenHeader'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm'
import {
  BRAND_PRIMARY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
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

  const setSegment = (next: AuthSegment) => {
    void Haptics.selectionAsync()
    if (resume) router.setParams({ mode: next, resume })
    else router.setParams({ mode: next })
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FCFCFC]" edges={['top', 'left', 'right']}>
      <AuthScreenHeader title="Account" />

      <View className="border-b border-gray-100 bg-[#FCFCFC] px-4 pb-3 pt-1">
        <View className="flex-row rounded-full bg-gray-100 p-1">
          <Pressable onPress={() => setSegment('signin')} className="flex-1">
            <View
              className="rounded-full py-2.5"
              style={
                segment === 'signin'
                  ? {
                      backgroundColor: '#fff',
                      shadowColor: '#000',
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: 2,
                    }
                  : undefined
              }
            >
              <Text
                className="text-center text-sm font-normal"
                style={{ color: segment === 'signin' ? BRAND_PRIMARY : TEXT_MUTED }}
              >
                Log in
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setSegment('signup')} className="flex-1">
            <View
              className="rounded-full py-2.5"
              style={
                segment === 'signup'
                  ? {
                      backgroundColor: '#fff',
                      shadowColor: '#000',
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: 2,
                    }
                  : undefined
              }
            >
              <Text
                className="text-center text-sm font-normal"
                style={{
                  color: segment === 'signup' ? BRAND_PRIMARY : TEXT_MUTED,
                }}
              >
                Sign up
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Text
        className="pb-2 pt-6 text-center text-2xl font-normal"
        style={{ color: TEXT_HEADING }}
      >
        {segment === 'signin' ? 'Welcome back' : 'Create an account'}
      </Text>

      {segment === 'signin' ? (
        <LoginForm
          resume={resume}
          showIntro={false}
          onSignInSuccess={async (payload) => {
            await navigateAfterAuth(router, {
              needsEmailVerification: payload.needsEmailVerification,
              user: payload.user,
            }, resumeForNav)
          }}
        />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="grow px-4 pb-8"
          >
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
