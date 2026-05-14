import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">@{username}</Text>
        <Text className="mt-2 text-sm text-gray-500">Public profile</Text>
      </View>
    </SafeAreaView>
  )
}
