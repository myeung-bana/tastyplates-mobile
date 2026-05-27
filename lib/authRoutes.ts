import type { Href, Router } from 'expo-router'

import { SCREEN_LOGIN } from '@/constants/screens'

/**
 * Serialized path for returning after successful auth (`navigateAfterAuth` → `resumeHref`).
 */
export type TypedResumeHref = Parameters<Router['replace']>[0]

/** Paths from URL params (`resume=`) cast for `router.replace` (Expo literal `Href`). */
export function coerceResumeHref(path: string | undefined): TypedResumeHref | undefined {
  if (path == null || path.length === 0) return undefined
  return path as TypedResumeHref
}

/**
 * Build `resume=` for login when forcing auth from `(tabs)`. Skips anonymous home-equivalent URLs.
 */
export function pathnameWithQueryResume(
  pathname: string | null | undefined,
  params?: Record<string, string | string[] | undefined>,
): string | undefined {
  const normalized = pathname?.trim() ?? ''
  if (
    normalized === '' ||
    normalized === '/' ||
    normalized === '/(tabs)' ||
    /^\/\(tabs\)\/?$/.test(normalized)
  ) {
    return undefined
  }

  const sp = new URLSearchParams()
  if (params) {
    for (const [key, raw] of Object.entries(params)) {
      if (raw == null) continue
      if (typeof key !== 'string' || key.startsWith('_')) continue
      const v = Array.isArray(raw) ? raw[0] : raw
      if (v === undefined || v === '') continue
      try {
        sp.append(key, String(v))
      } catch {
        // ignore malformed values
      }
    }
  }
  const qs = sp.toString()
  return qs.length === 0 ? normalized : `${normalized}?${qs}`
}

export function serializeAuthResume(
  href?: Parameters<Router['replace']>[0],
): string | undefined {
  if (href == null) return undefined
  if (typeof href === 'string') return href
  const o = href as { pathname?: string; params?: Record<string, unknown> }
  if (typeof o.pathname !== 'string') return undefined
  if (!o.params || typeof o.params !== 'object') return o.pathname

  try {
    const entries = Object.entries(o.params).filter(
      ([, v]) => v != null && String(v).length > 0,
    ) as [string, string][]
    if (entries.length === 0) return o.pathname
    const q = new URLSearchParams(entries).toString()
    return `${o.pathname}?${q}`
  } catch {
    return o.pathname
  }
}

export type AuthScreenMode = 'chooser' | 'signin' | 'signup'

/**
 * Stable `Href` for the login screen.
 * Omit `mode` for the method chooser (Sign Up Free / Google / Email).
 */
export function loginScreenHref(options?: {
  resume?: string
  mode?: AuthScreenMode
}): Href {
  const params: Record<string, string> = {}
  if (options?.mode === 'signup' || options?.mode === 'signin') {
    params.mode = options.mode
  }
  if (options?.resume?.length) params.resume = options.resume
  return Object.keys(params).length === 0
    ? SCREEN_LOGIN
    : { pathname: SCREEN_LOGIN, params }
}

export function pushLoginScreen(
  router: Router,
  options?: { resume?: Parameters<Router['replace']>[0]; mode?: AuthScreenMode },
): void {
  const resume = serializeAuthResume(options?.resume)
  router.push(
    loginScreenHref({
      mode: options?.mode,
      resume,
    }),
  )
}
