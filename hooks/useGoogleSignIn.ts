import { useCallback, useMemo, useState } from 'react'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import type { User } from '@nhost/nhost-js'
import { useNhostClient } from '@nhost/react'

import { SCREEN_LOGIN } from '@/constants/screens'
import { authDeepLink } from '@/lib/authRedirectUrls'
import { buildOAuthProviderUrl } from '@/lib/nhostAuthDirect'
import { toast } from '@/utils/toast'

export type GoogleSignInSuccessPayload = {
  needsEmailVerification: boolean
  user: User | null
}

type UseGoogleSignInOptions = {
  onSuccess: (payload: GoogleSignInSuccessPayload) => void | Promise<void>
}

/**
 * Shared Nhost Google OAuth flow for auth screens (chooser + login form).
 */
export function useGoogleSignIn({ onSuccess }: UseGoogleSignInOptions) {
  const nhost = useNhostClient()
  const [googleBusy, setGoogleBusy] = useState(false)
  const redirectTo = useMemo(() => authDeepLink(SCREEN_LOGIN), [])
  const providerUrl = useMemo(
    () => buildOAuthProviderUrl('google', redirectTo),
    [redirectTo],
  )

  const continueWithGoogle = useCallback(async () => {
    if (googleBusy) return
    setGoogleBusy(true)
    try {
      const result = await WebBrowser.openAuthSessionAsync(providerUrl, redirectTo)
      if (result.type !== 'success') return
      if (!('url' in result) || result.url.length === 0) {
        toast.error('Could not complete Google sign-in.')
        return
      }
      const query = Linking.parse(result.url).queryParams
      const oauthErr = query?.error
      if (oauthErr != null && String(oauthErr).length > 0) {
        const desc =
          typeof query?.errorDescription === 'string' ? query.errorDescription : String(oauthErr)
        toast.error(desc)
        return
      }
      const refreshToken = readRefreshTokenFromCallbackUrl(result.url)
      if (!refreshToken) {
        toast.error('Could not complete Google sign-in.')
        return
      }
      const refreshed = await nhost.auth.refreshSession(refreshToken)
      if (refreshed.error) {
        toast.error(refreshed.error.message ?? 'Could not finish sign-in.')
        return
      }
      const user: User | null = refreshed.session?.user ?? nhost.auth.getUser()
      if (!user) {
        toast.error('Could not finish sign-in.')
        return
      }
      await onSuccess({
        needsEmailVerification: false,
        user,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Google sign-in failed.')
    } finally {
      setGoogleBusy(false)
    }
  }, [googleBusy, nhost, onSuccess, providerUrl, redirectTo])

  return { continueWithGoogle, googleBusy }
}

/** Nhost appends refreshToken to OAuth redirect (?refreshToken=…). */
function readRefreshTokenFromCallbackUrl(rawUrl: string): string | null {
  const qp = Linking.parse(rawUrl).queryParams?.refreshToken
  if (typeof qp === 'string' && qp.length > 0) return qp

  try {
    const qPart = rawUrl.split('?')[1]
    const beforeHash = qPart?.split('#')[0] ?? ''
    if (beforeHash) {
      const fromQuery = new URLSearchParams(beforeHash).get('refreshToken')
      if (fromQuery) return fromQuery
    }
    const hash = rawUrl.includes('#') ? rawUrl.split('#')[1]! : ''
    if (hash) {
      const fromHash = new URLSearchParams(hash).get('refreshToken')
      if (fromHash) return fromHash
    }
  } catch {
    /* ignore */
  }

  return null
}
