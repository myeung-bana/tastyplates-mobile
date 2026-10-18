import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'

import { BRAND_PRIMARY } from '@/constants/brand'
import { SCREEN_HOME } from '@/constants/screens'
import { openLegalPage, type LegalPageSlug } from '@/lib/legalLinks'

/** Deep-link target for a legal route: opens the canonical web page, then leaves the screen. */
export function LegalPageRedirect({ slug }: { slug: LegalPageSlug }): JSX.Element {
  useEffect(() => {
    let cancelled = false
    void openLegalPage(slug).finally(() => {
      if (cancelled) return
      if (router.canGoBack()) router.back()
      else router.replace(SCREEN_HOME)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator color={BRAND_PRIMARY} />
    </View>
  )
}
