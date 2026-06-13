import type { User } from '@nhost/nhost-js'

import { authDeepLink } from '@/lib/authRedirectUrls'
import { nhost } from '@/lib/nhost'

type AuthErrorPayload = {
  message?: string
  error?: string
  status?: number
}

function getNhostAuthBaseUrl(): string {
  const fromClient = nhost.auth.url?.replace(/\/$/, '')
  if (fromClient) return fromClient

  const subdomain = process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN
  const region = process.env.EXPO_PUBLIC_NHOST_REGION
  if (!subdomain || !region) {
    throw new Error('Nhost auth is not configured (missing subdomain/region).')
  }
  return `https://${subdomain}.auth.${region}.nhost.run/v1`
}

function readAuthErrorMessage(payload: unknown, fallback: string): string {
  if (payload == null || typeof payload !== 'object') return fallback
  const err = payload as AuthErrorPayload
  if (typeof err.message === 'string' && err.message.length > 0) return err.message
  if (typeof err.error === 'string' && err.error.length > 0) return err.error
  return fallback
}

async function postAuth<T>(path: string, body: unknown, accessToken?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: '*/*',
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const res = await fetch(`${getNhostAuthBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  if (!res.ok) {
    const wrapped =
      json != null && typeof json === 'object' && 'error' in json
        ? (json as { error: unknown }).error
        : json
    throw new Error(readAuthErrorMessage(wrapped, `Auth request failed (${res.status})`))
  }

  return json as T
}

type SignUpResponse = {
  session?: {
    accessToken?: string
    refreshToken?: string
    user?: User
  } | null
}

/** OAuth provider URL without SDK `rewriteRedirectTo`. */
export function buildOAuthProviderUrl(provider: string, redirectTo: string): string {
  const params = new URLSearchParams({ redirectTo })
  return `${getNhostAuthBaseUrl()}/signin/provider/${provider}?${params.toString()}`
}

export type SignUpEmailPasswordDirectResult = {
  needsEmailVerification: boolean
  user: User | null
  isError: boolean
  error: { message: string } | null
}

/**
 * Sign up without `@nhost/hasura-auth-js` `rewriteRedirectTo` — that helper turns
 * `tastyplates://…` into `null/` on React Native when `clientUrl` is set.
 */
export async function signUpEmailPasswordDirect(
  email: string,
  password: string,
  options?: { displayName?: string; redirectPath?: string },
): Promise<SignUpEmailPasswordDirectResult> {
  const redirectTo = authDeepLink(options?.redirectPath ?? '/user-verification')

  try {
    const data = await postAuth<SignUpResponse>('/signup/email-password', {
      email,
      password,
      options: {
        displayName: options?.displayName,
        redirectTo,
      },
    })

    const refreshToken = data.session?.refreshToken
    if (refreshToken) {
      await nhost.auth.refreshSession(refreshToken)
    }

    const user = data.session?.user ?? nhost.auth.getUser()
    const needsEmailVerification = !user?.emailVerified

    return {
      needsEmailVerification,
      user: user ?? null,
      isError: false,
      error: null,
    }
  } catch (e) {
    return {
      needsEmailVerification: false,
      user: null,
      isError: true,
      error: { message: e instanceof Error ? e.message : 'Could not create account' },
    }
  }
}

export type AuthActionResult = {
  isError: boolean
  error: { message: string } | null
}

/** Resend verification email — same redirect bypass as sign-up. */
export async function sendVerificationEmailDirect(
  email: string,
  redirectPath = '/user-verification',
): Promise<AuthActionResult> {
  const redirectTo = authDeepLink(redirectPath)

  try {
    await postAuth('/user/email/send-verification-email', {
      email,
      options: { redirectTo },
    })
    return { isError: false, error: null }
  } catch (e) {
    return {
      isError: true,
      error: { message: e instanceof Error ? e.message : 'Could not send email' },
    }
  }
}

/** Password reset email — same redirect bypass. */
export async function resetPasswordEmailDirect(
  email: string,
  redirectPath = '/reset-password',
): Promise<AuthActionResult> {
  const redirectTo = authDeepLink(redirectPath)

  try {
    await postAuth('/user/password/reset', {
      email,
      options: { redirectTo },
    })
    return { isError: false, error: null }
  } catch (e) {
    return {
      isError: true,
      error: { message: e instanceof Error ? e.message : 'Could not send reset email' },
    }
  }
}
