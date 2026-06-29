import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { Keyboard } from 'react-native'

import { AuthFormBody } from '@/components/auth/AuthFormBody'
import { FullScreenOverlay } from '@/components/layout/FullScreenOverlay'
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
  const [isOpen, setIsOpen] = useState(false)
  const [overlayKey, setOverlayKey] = useState(0)
  const [initialMode, setInitialMode] = useState<AuthScreenMode>('chooser')
  const [resume, setResume] = useState<string | undefined>(undefined)
  const [showSkipLogin, setShowSkipLogin] = useState(false)

  const dismissOverlay = useCallback(() => {
    Keyboard.dismiss()
    setIsOpen(false)
  }, [])

  const openAuthSheet = useCallback((options?: OpenAuthSheetOptions) => {
    setInitialMode(options?.mode ?? 'chooser')
    setResume(serializeAuthResume(options?.resume))
    setShowSkipLogin(options?.showSkipLogin ?? false)
    setOverlayKey((k) => k + 1)
    setIsOpen(true)
  }, [])

  useEffect(() => {
    authSheetOpenRef.current = openAuthSheet
    return () => {
      authSheetOpenRef.current = null
    }
  }, [openAuthSheet])

  const value = useMemo(
    () => ({
      openAuthSheet,
      closeAuthSheet: dismissOverlay,
    }),
    [openAuthSheet, dismissOverlay],
  )

  return (
    <AuthSheetContext.Provider value={value}>
      {children}
      <FullScreenOverlay
        visible={isOpen}
        onRequestClose={dismissOverlay}
        animationType="slide"
        keyboardAvoiding={false}
        style={{ paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }}
      >
        {isOpen ? (
          <AuthFormBody
            key={overlayKey}
            layout="overlay"
            initialMode={initialMode}
            resume={resume}
            showSkipLogin={showSkipLogin}
            onBeforeNavigate={dismissOverlay}
            onClose={dismissOverlay}
          />
        ) : null}
      </FullScreenOverlay>
    </AuthSheetContext.Provider>
  )
}
