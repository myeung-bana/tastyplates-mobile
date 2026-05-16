/**
 * Optional absolute base for in-app browser links (e.g. articles on the marketing site).
 * Example: `https://www.tastyplates.com` (no trailing slash).
 */
export function getWebOrigin(): string {
  return (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? '').replace(/\/$/, '')
}
