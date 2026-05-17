/** Same source as `getWebApiBase()` in `homeContentApi.ts` — duplicated here to avoid import cycles. */
function envWebApiBase(): string {
  return (process.env.EXPO_PUBLIC_WEB_API_URL ?? '').replace(/\/$/, '')
}

/**
 * Optional absolute base for in-app browser links (e.g. articles on the marketing site).
 * Example: `https://www.tastyplates.com` (no trailing slash).
 */
export function getWebOrigin(): string {
  return (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? '').replace(/\/$/, '')
}

/**
 * Same as `getWebOrigin`, or — when unset — the origin of `EXPO_PUBLIC_WEB_API_URL`
 * so “Read article” works when only the API base is configured (same host as web).
 */
export function getMarketingWebOrigin(): string {
  const direct = getWebOrigin()
  if (direct) return direct
  const api = envWebApiBase()
  if (!api) return ''
  try {
    const u = new URL(api.startsWith('http') ? api : `https://${api}`)
    return `${u.protocol}//${u.host}`
  } catch {
    return ''
  }
}
