import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'

import { BRAND_PRIMARY } from '@/constants/brand'
import { SCREEN_RESTAURANTS } from '@/constants/screens'

function singleParam(v: string | string[] | undefined): string {
  if (v == null) return ''
  return Array.isArray(v) ? (v[0] ?? '') : v
}

/** Deep link shim — `/restaurants/cuisines/:slug` → Explore tab with `?cuisine=`. */
export default function CuisineBrowseRedirectScreen() {
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>()
  const cuisine = singleParam(slug).trim()

  useEffect(() => {
    if (!cuisine) {
      router.replace(SCREEN_RESTAURANTS)
    }
  }, [cuisine, router])

  if (!cuisine) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={BRAND_PRIMARY} />
      </View>
    )
  }

  return <Redirect href={{ pathname: SCREEN_RESTAURANTS, params: { cuisine } }} />
}
