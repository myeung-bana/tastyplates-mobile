import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'

export default function ReviewViewerScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId?: string }>()

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg font-semibold text-white">Review viewer</Text>
        <Text className="mt-2 text-center text-sm text-gray-400">
          Full-screen viewer coming soon
          {reviewId ? `\nReview: ${reviewId}` : ''}
        </Text>
      </View>
    </SafeAreaView>
  )
}
