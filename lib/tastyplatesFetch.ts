import { nhost } from '@/lib/nhost'

/**
 * Nhost Functions JSON envelope (`functions/_lib/respond.ts`).
 * Mobile uses `EXPO_PUBLIC_NHOST_FUNCTIONS_URL` (includes `/v1` when copied from Nhost dashboard).
 */
export type Envelope<T> = { ok: true; data: T } | { ok: false; error: string; details?: unknown }

export function getNhostFunctionsBase(): string {
  return (process.env.EXPO_PUBLIC_NHOST_FUNCTIONS_URL ?? '').replace(/\/$/, '')
}

export interface TastyplatesFetchOptions extends RequestInit {
  /** When true, attaches `Authorization: Bearer` from Nhost if a session exists. */
  withAuth?: boolean
}

/**
 * Typed fetch against Nhost Functions. Path is appended after the configured base (no leading slash required).
 */
export async function tastyplatesFetch<T>(
  path: string,
  init?: TastyplatesFetchOptions,
): Promise<Envelope<T>> {
  const base = getNhostFunctionsBase()
  if (!base) {
    return { ok: false, error: 'EXPO_PUBLIC_NHOST_FUNCTIONS_URL is not set' }
  }

  const { withAuth, headers: h, ...rest } = init ?? {}
  const headers = new Headers(h)

  if (withAuth) {
    const token = nhost.auth.getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Content-Type') && rest.body && typeof rest.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const url = `${base}/${path.replace(/^\//, '')}`

  try {
    const res = await fetch(url, { ...rest, headers })
    const json = (await res.json()) as Envelope<T>
    return json
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed'
    return { ok: false, error: message }
  }
}

/** Unwraps a successful envelope or throws with `error` text. */
export function unwrapEnvelope<T>(envelope: Envelope<T>): T {
  if (!envelope.ok) {
    throw new Error(envelope.error)
  }
  return envelope.data
}
