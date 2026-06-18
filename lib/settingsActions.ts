import { Alert } from 'react-native'
import * as Haptics from 'expo-haptics'
import type { Router } from 'expo-router'

import { SCREEN_GET_STARTED } from '@/constants/screens'
import { resetToGetStartedLanding } from '@/lib/guestBrowse'

export function confirmLogOut(options: {
  router: Router
  signOut: () => Promise<unknown>
  onSigningOutChange?: (signingOut: boolean) => void
}): void {
  void Haptics.selectionAsync()
  Alert.alert(
    'Log out?',
    'You will need to sign in again to access your profile and saved data.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            options.onSigningOutChange?.(true)
            try {
              await resetToGetStartedLanding()
              options.router.replace(SCREEN_GET_STARTED)
              await options.signOut()
            } finally {
              options.onSigningOutChange?.(false)
            }
          })()
        },
      },
    ],
  )
}
