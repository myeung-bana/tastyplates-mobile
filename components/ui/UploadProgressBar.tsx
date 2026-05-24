import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BRAND_PRIMARY } from '@/constants/brand'
import { useUpload } from '@/contexts/UploadContext'

export function UploadProgressBar(): JSX.Element | null {
  const insets = useSafeAreaInsets()
  const { isVisible, progress, message } = useUpload()
  const [localProgress, setLocalProgress] = useState(0)

  useEffect(() => {
    if (progress > localProgress) {
      const t = globalThis.setTimeout(() => {
        setLocalProgress((prev) => Math.min(prev + 2, progress))
      }, 10)
      return () => globalThis.clearTimeout(t)
    }
    if (progress < localProgress) setLocalProgress(progress)
    return undefined
  }, [progress, localProgress])

  if (!isVisible) return null

  return (
    <View
      className="absolute left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-md"
      style={{ top: insets.top }}
    >
      <View className="mx-auto w-full max-w-xl flex-row items-center justify-between px-4 py-2.5">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {localProgress < 100 ? (
            <View
              className="h-4 w-4 rounded-full border-2 border-t-transparent"
              style={{ borderColor: BRAND_PRIMARY }}
            />
          ) : (
            <Text className="text-green-500">✓</Text>
          )}
          <Text className="font-neusans text-sm text-gray-700" numberOfLines={1}>
            {message}
          </Text>
        </View>
        <Text className="font-neusans text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
          {localProgress}%
        </Text>
      </View>
      <View className="h-1 bg-gray-100">
        <View className="h-1" style={{ width: `${localProgress}%`, backgroundColor: BRAND_PRIMARY }} />
      </View>
    </View>
  )
}
