import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? ''

/** Crash reporting is off in dev and whenever no DSN is configured for the EAS environment. */
export const sentryEnabled = Boolean(dsn) && !__DEV__

export function initSentry(): void {
  if (!sentryEnabled) return
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'production',
    release: Constants.expoConfig?.version,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.user) {
        event.user = event.user.id ? { id: event.user.id } : undefined
      }
      return event
    },
  })
}

export function setSentryUser(userId: string | null): void {
  if (!sentryEnabled) return
  Sentry.setUser(userId ? { id: userId } : null)
}

export { Sentry }
