import { Linking } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

import { getMarketingWebOrigin } from '@/lib/webAssets'

export type LegalPageSlug =
  | 'privacy-policy'
  | 'terms-of-service'
  | 'content-guidelines'
  | 'cookie-policy'
  | 'account/delete'

const FALLBACK_WEB_ORIGIN = 'https://tastyplates.co'

export function legalPageUrl(slug: LegalPageSlug): string {
  return `${getMarketingWebOrigin() || FALLBACK_WEB_ORIGIN}/${slug}`
}

export async function openLegalPage(slug: LegalPageSlug): Promise<void> {
  const url = legalPageUrl(slug)
  try {
    await WebBrowser.openBrowserAsync(url)
  } catch {
    await Linking.openURL(url).catch(() => undefined)
  }
}
