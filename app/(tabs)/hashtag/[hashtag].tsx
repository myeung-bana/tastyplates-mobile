import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'

export default function HashtagFeedScreen() {
  const { hashtag } = useLocalSearchParams<{ hashtag: string }>()
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">#{hashtag}</Text>
        <Text className="mt-2 text-sm text-gray-500">Reviews tagged with this hashtag</Text>
      </View>
    </SafeAreaView>
  )
}
