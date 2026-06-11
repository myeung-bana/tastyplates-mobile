import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
  type PropsWithChildren,
} from 'react'
import { Keyboard, StyleSheet } from 'react-native'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthFormBody } from '@/components/auth/AuthFormBody'
import { AuthFormPanel, authSheetPanelStyle } from '@/components/auth/AuthFormPanel'
import type { AuthScreenMode } from '@/lib/authRoutes'
import { serializeAuthResume } from '@/lib/authRoutes'
import type { OpenAuthSheetOptions } from '@/lib/authSheetRef'
import { authSheetOpenRef } from '@/lib/authSheetRef'

export type { OpenAuthSheetOptions } from '@/lib/authSheetRef'

type AuthSheetContextValue = {
  openAuthSheet: (options?: OpenAuthSheetOptions) => void
  closeAuthSheet: () => void
}

const AuthSheetContext = createContext<AuthSheetContextValue | null>(null)

export function useAuthSheet(): AuthSheetContextValue {
  const ctx = useContext(AuthSheetContext)
  if (!ctx) {
    throw new Error('useAuthSheet must be used within AuthSheetProvider')
  }
  return ctx
}

export function AuthSheetProvider({ children }: PropsWithChildren): JSX.Element {
  const insets = useSafeAreaInsets()
  const sheetRef = useRef<ElementRef<typeof BottomSheetModal>>(null)
  const [sheetKey, setSheetKey] = useState(0)
  const [initialMode, setInitialMode] = useState<AuthScreenMode>('chooser')
  const [resume, setResume] = useState<string | undefined>(undefined)
  const [showSkipLogin, setShowSkipLogin] = useState(false)

  /** 75% leaves headroom so the keyboard does not cover email/password fields. */
  const snapPoints = useMemo(() => ['75%'], [])

  const dismissSheet = useCallback(() => {
    Keyboard.dismiss()
    sheetRef.current?.dismiss()
  }, [])

  const openAuthSheet = useCallback((options?: OpenAuthSheetOptions) => {
    setInitialMode(options?.mode ?? 'chooser')
    setResume(serializeAuthResume(options?.resume))
    setShowSkipLogin(options?.showSkipLogin ?? false)
    setSheetKey((k) => k + 1)
    sheetRef.current?.present()
  }, [])

  useEffect(() => {
    authSheetOpenRef.current = openAuthSheet
    return () => {
      authSheetOpenRef.current = null
    }
  }, [openAuthSheet])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  )

  const value = useMemo(
    () => ({
      openAuthSheet,
      closeAuthSheet: dismissSheet,
    }),
    [openAuthSheet, dismissSheet],
  )

  return (
    <AuthSheetContext.Provider value={value}>
      {children}
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.hiddenHandle}
        backgroundStyle={authSheetPanelStyle.sheet}
        onDismiss={() => Keyboard.dismiss()}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <AuthFormBody
            key={sheetKey}
            initialMode={initialMode}
            resume={resume}
            showSkipLogin={showSkipLogin}
            onBeforeNavigate={dismissSheet}
            renderShell={({ title, subtitle, headerSlot, body }) => (
              <AuthFormPanel title={title} subtitle={subtitle} headerSlot={headerSlot}>
                {body}
              </AuthFormPanel>
            )}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    </AuthSheetContext.Provider>
  )
}

const styles = StyleSheet.create({
  hiddenHandle: {
    opacity: 0,
    height: 0,
  },
})
