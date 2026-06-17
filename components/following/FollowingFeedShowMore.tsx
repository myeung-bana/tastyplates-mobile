import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

type Props = {
  label: string
  loading?: boolean
  onPress: () => void
}

export function FollowingFeedShowMore({ label, loading = false, onPress }: Props): JSX.Element {
  return (
    <View className="items-center px-4 py-6">
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => {
          void Haptics.selectionAsync()
          onPress()
        }}
        className="min-w-[200px] items-center rounded-full border px-6 py-3 active:opacity-90"
        style={{
          borderColor: '#d1d5db',
          backgroundColor: '#ffffff',
          opacity: loading ? 0.65 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={BRAND_PRIMARY} />
        ) : (
          <Text className="font-neusans text-sm font-semibold" style={{ color: TEXT_HEADING }}>
            {label}
          </Text>
        )}
      </Pressable>
    </View>
  )
}
